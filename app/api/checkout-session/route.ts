import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { createHash, randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { ensureDatabaseSchema } from "@/lib/db-schema";
import { connectToDatabase } from "@/lib/mongodb";
import { getCommonPaymentEnv, getEsewaEnv, getKhaltiEnv } from "@/lib/payments/env";
import { generateEsewaSignature } from "@/lib/payments/esewa-signature";
import type { PaymentMethod, PaymentRequestData } from "@/lib/payments/types";
import { COLLECTIONS } from "@/types/entities";

type TransactionDoc = {
  _id: ObjectId;
  buyerId: unknown;
  amount: number;
  status: string;
  provider?: string;
  providerRef?: string;
  esewaTransactionUuid?: string | null;
  esewaRefId?: string | null;
  khaltiPidx?: string | null;
};

type EsewaVerifyResponse = {
  status?: string;
  transaction_uuid?: string;
  total_amount?: string | number;
  transaction_code?: string;
};

type KhaltiInitiateResponse = {
  payment_url?: string;
  pidx?: string;
};

type KhaltiVerifyResponse = {
  status?: string;
  state?: { name?: string };
  purchase_order_id?: string;
  total_amount?: number;
  transaction_id?: string;
};

function toAmountNumber(amount: string): number {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Invalid amount");
  }
  return Math.round(parsed * 100) / 100;
}

function parseObjectId(id: string): ObjectId | null {
  if (!ObjectId.isValid(id)) return null;
  return new ObjectId(id);
}

function asString(value: unknown): string {
  if (value instanceof ObjectId) return value.toHexString();
  return String(value);
}

function payloadHash(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function isOwnedByUser(tx: TransactionDoc, userId: string): boolean {
  return asString(tx.buyerId) === userId;
}

export async function POST(req: Request) {
  try {
    await ensureDatabaseSchema();
    const commonEnv = getCommonPaymentEnv();

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as PaymentRequestData;
    const { amount, productName, transactionId, method } = body;

    if (!amount || !productName || !transactionId || !method) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (method !== "esewa" && method !== "khalti") {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
    }

    const txObjectId = parseObjectId(transactionId);
    if (!txObjectId) {
      return NextResponse.json({ error: "Invalid transactionId" }, { status: 400 });
    }

    const amountNpr = toAmountNumber(amount);
    const { db } = await connectToDatabase();
    const tx = (await db.collection(COLLECTIONS.transactions).findOne({
      _id: txObjectId,
    })) as TransactionDoc | null;

    if (!tx) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }
    if (!isOwnedByUser(tx, session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (tx.status !== "pending") {
      return NextResponse.json({ error: "Transaction is not pending" }, { status: 400 });
    }
    if (Math.abs(tx.amount - amountNpr) > 0.01) {
      return NextResponse.json({ error: "Amount mismatch for transaction" }, { status: 400 });
    }

    if (method === "esewa") {
      const esewaEnv = getEsewaEnv();
      const transactionUuid = `${Date.now()}-${randomUUID()}`;
      const totalAmount = amountNpr.toFixed(2);
      const signatureString = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${esewaEnv.esewaMerchantCode}`;
      const signature = generateEsewaSignature(esewaEnv.esewaSecretKey, signatureString);

      const esewaConfig = {
        amount: totalAmount,
        tax_amount: "0",
        total_amount: totalAmount,
        transaction_uuid: transactionUuid,
        product_code: esewaEnv.esewaMerchantCode,
        product_service_charge: "0",
        product_delivery_charge: "0",
        success_url: `${commonEnv.baseUrl}/payments/success?method=esewa`,
        failure_url: `${commonEnv.baseUrl}/payments/failed?method=esewa`,
        signed_field_names: "total_amount,transaction_uuid,product_code",
        signature,
      };

      await db.collection(COLLECTIONS.transactions).updateOne(
        { _id: txObjectId, status: "pending" },
        {
          $set: {
            provider: "esewa",
            esewaTransactionUuid: transactionUuid,
            gatewayPayloadHash: payloadHash(esewaConfig),
            updatedAt: new Date(),
          },
        }
      );

      return NextResponse.json({
        method: "esewa",
        formUrl: esewaEnv.esewaFormUrl,
        esewaConfig,
      });
    }

    const khaltiEnv = getKhaltiEnv();
    const khaltiPayload = {
      return_url: `${commonEnv.baseUrl}/payments/success?method=khalti&paymentId=${transactionId}`,
      website_url: commonEnv.baseUrl,
      amount: Math.round(amountNpr * 100),
      purchase_order_id: transactionId,
      purchase_order_name: productName,
      customer_info: {
        name: session.user.name || "Bid Bazar Buyer",
        email: session.user.email || "buyer@example.com",
        phone: "9800000000",
      },
    };

    const initiateRes = await fetch(khaltiEnv.khaltiInitiateUrl, {
      method: "POST",
      headers: {
        Authorization: `Key ${khaltiEnv.khaltiSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(khaltiPayload),
    });

    if (!initiateRes.ok) {
      const details = await initiateRes.text();
      return NextResponse.json(
        { error: "Khalti initiation failed", details },
        { status: 400 }
      );
    }

    const initiateJson = (await initiateRes.json()) as KhaltiInitiateResponse;
    if (!initiateJson.payment_url || !initiateJson.pidx) {
      return NextResponse.json(
        { error: "Invalid Khalti initiation response" },
        { status: 502 }
      );
    }

    await db.collection(COLLECTIONS.transactions).updateOne(
      { _id: txObjectId, status: "pending" },
      {
        $set: {
          provider: "khalti",
          khaltiPidx: initiateJson.pidx,
          gatewayPayloadHash: payloadHash(initiateJson),
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      method: "khalti",
      khaltiPaymentUrl: initiateJson.payment_url,
      pidx: initiateJson.pidx,
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Error creating payment session", details },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    await ensureDatabaseSchema();

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const methodRaw = searchParams.get("method");
    const paymentIdRaw = searchParams.get("paymentId");
    const pidx = searchParams.get("pidx");
    const dataRaw = searchParams.get("data");

    let normalizedMethod: PaymentMethod | null = null;
    let extractedDataFromMethod: string | null = null;

    if (methodRaw) {
      if (methodRaw === "esewa" || methodRaw.startsWith("esewa?data=")) {
        normalizedMethod = "esewa";
        if (methodRaw.startsWith("esewa?data=")) {
          const part = methodRaw.split("?data=")[1];
          extractedDataFromMethod = part || null;
        }
      } else if (methodRaw === "khalti") {
        normalizedMethod = "khalti";
      }
    }

    if (!normalizedMethod) {
      return NextResponse.json({ status: "error", message: "Invalid method" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    if (normalizedMethod === "esewa") {
      const esewaEnv = getEsewaEnv();
      let extractedData = dataRaw || extractedDataFromMethod;
      const cleanedPaymentId = paymentIdRaw ? paymentIdRaw.split("?")[0] : null;
      if (!extractedData && paymentIdRaw?.includes("?data=")) {
        const dataPart = paymentIdRaw.split("?data=")[1];
        extractedData = dataPart || null;
      }

      if (!extractedData) {
        return NextResponse.json(
          { status: "error", message: "Missing eSewa data payload" },
          { status: 400 }
        );
      }

      let decoded: { status?: string; total_amount?: string; transaction_uuid?: string; ref_id?: string };
      try {
        decoded = JSON.parse(Buffer.from(extractedData, "base64").toString("utf-8")) as {
          status?: string;
          total_amount?: string;
          transaction_uuid?: string;
          ref_id?: string;
        };
      } catch {
        return NextResponse.json({ status: "error", message: "Invalid eSewa payload" }, { status: 400 });
      }

      if (decoded.status !== "COMPLETE" || !decoded.transaction_uuid || !decoded.total_amount) {
        return NextResponse.json({ status: "pending", message: "Payment not complete yet" });
      }

      const txObjectId = cleanedPaymentId ? parseObjectId(cleanedPaymentId) : null;
      let tx: TransactionDoc | null = null;

      if (txObjectId) {
        tx = (await db.collection(COLLECTIONS.transactions).findOne({
          _id: txObjectId,
        })) as TransactionDoc | null;
      }

      if (!tx) {
        tx = (await db.collection(COLLECTIONS.transactions).findOne({
          esewaTransactionUuid: decoded.transaction_uuid,
        })) as TransactionDoc | null;
      }

      if (!tx) {
        return NextResponse.json({ status: "error", message: "Transaction not found" }, { status: 404 });
      }
      if (!isOwnedByUser(tx, session.user.id)) {
        return NextResponse.json({ status: "error", message: "Forbidden" }, { status: 403 });
      }
      if (tx.status === "paid") {
        return NextResponse.json({ status: "success", message: "Already verified" });
      }
      if (tx.status !== "pending") {
        return NextResponse.json({ status: "error", message: "Transaction is not pending" }, { status: 400 });
      }

      const verifyUrl = `${esewaEnv.esewaVerifyUrl}?product_code=${encodeURIComponent(esewaEnv.esewaMerchantCode)}&total_amount=${encodeURIComponent(decoded.total_amount)}&transaction_uuid=${encodeURIComponent(decoded.transaction_uuid)}`;
      const verifyRes = await fetch(verifyUrl, { method: "GET" });
      if (!verifyRes.ok) {
        return NextResponse.json(
          { status: "error", message: "eSewa verification failed" },
          { status: 400 }
        );
      }

      const verifyJson = (await verifyRes.json()) as EsewaVerifyResponse;
      if (
        verifyJson.status !== "COMPLETE" ||
        verifyJson.transaction_uuid !== decoded.transaction_uuid
      ) {
        return NextResponse.json(
          { status: "error", message: "Invalid eSewa verification response" },
          { status: 400 }
        );
      }

      const verifiedAmount = Number(verifyJson.total_amount);
      if (!Number.isFinite(verifiedAmount) || Math.abs(verifiedAmount - tx.amount) > 0.01) {
        return NextResponse.json({ status: "error", message: "Amount mismatch" }, { status: 400 });
      }

      const updateResult = await db.collection(COLLECTIONS.transactions).updateOne(
        { _id: tx._id, status: "pending" },
        {
          $set: {
            status: "paid",
            provider: "esewa",
            providerRef:
              verifyJson.transaction_code || decoded.ref_id || decoded.transaction_uuid,
            esewaTransactionUuid: decoded.transaction_uuid,
            esewaRefId: decoded.ref_id ?? null,
            paidAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      if (updateResult.modifiedCount === 0) {
        return NextResponse.json({ status: "error", message: "Already processed" }, { status: 409 });
      }

      return NextResponse.json({ status: "success", message: "eSewa payment verified" });
    }

    if (!paymentIdRaw) {
      return NextResponse.json({ status: "error", message: "Missing paymentId" }, { status: 400 });
    }
    const txObjectId = parseObjectId(paymentIdRaw);
    if (!txObjectId) {
      return NextResponse.json({ status: "error", message: "Invalid paymentId" }, { status: 400 });
    }
    const tx = (await db.collection(COLLECTIONS.transactions).findOne({
      _id: txObjectId,
    })) as TransactionDoc | null;
    if (!tx) {
      return NextResponse.json({ status: "error", message: "Transaction not found" }, { status: 404 });
    }
    if (!isOwnedByUser(tx, session.user.id)) {
      return NextResponse.json({ status: "error", message: "Forbidden" }, { status: 403 });
    }
    if (tx.status === "paid") {
      return NextResponse.json({ status: "success", message: "Already verified" });
    }
    if (tx.status !== "pending") {
      return NextResponse.json({ status: "error", message: "Transaction is not pending" }, { status: 400 });
    }

    const khaltiTxn = pidx || tx.khaltiPidx;
    if (!khaltiTxn) {
      return NextResponse.json({ status: "error", message: "Missing Khalti pidx" }, { status: 400 });
    }

    const khaltiEnv = getKhaltiEnv();
    const verifyRes = await fetch(khaltiEnv.khaltiVerifyUrl, {
      method: "POST",
      headers: {
        Authorization: `Key ${khaltiEnv.khaltiSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pidx: khaltiTxn }),
    });

    if (!verifyRes.ok) {
      return NextResponse.json(
        { status: "error", message: "Khalti verification failed" },
        { status: 400 }
      );
    }

    const verifyJson = (await verifyRes.json()) as KhaltiVerifyResponse;
    const khaltiStatus = verifyJson.status || verifyJson.state?.name;
    if (khaltiStatus !== "Completed") {
      return NextResponse.json({ status: "pending", message: "Payment not completed" }, { status: 400 });
    }

    if (verifyJson.purchase_order_id && verifyJson.purchase_order_id !== paymentIdRaw) {
      return NextResponse.json({ status: "error", message: "Order ID mismatch" }, { status: 400 });
    }

    const verifiedAmount = Number(verifyJson.total_amount) / 100;
    if (!Number.isFinite(verifiedAmount) || Math.abs(verifiedAmount - tx.amount) > 0.01) {
      return NextResponse.json({ status: "error", message: "Amount mismatch" }, { status: 400 });
    }

    const updateResult = await db.collection(COLLECTIONS.transactions).updateOne(
      { _id: txObjectId, status: "pending" },
      {
        $set: {
          status: "paid",
          provider: "khalti",
          providerRef: verifyJson.transaction_id || khaltiTxn,
          khaltiPidx: khaltiTxn,
          paidAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    if (updateResult.modifiedCount === 0) {
      return NextResponse.json({ status: "error", message: "Already processed" }, { status: 409 });
    }

    return NextResponse.json({ status: "success", message: "Khalti payment verified" });
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { status: "error", message: "Verification failed", details },
      { status: 500 }
    );
  }
}
