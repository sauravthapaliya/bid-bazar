import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { auth } from "@/auth";
import { getGridFSBucket } from "@/lib/gridfs";
import { ensureDatabaseSchema } from "@/lib/db-schema";

const ALLOWED_DOCUMENT_TYPES = new Set(["image/jpeg", "image/png"]);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    await ensureDatabaseSchema();

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, message: "Missing file. Use form-data key: file" },
        { status: 400 }
      );
    }

    if (!ALLOWED_DOCUMENT_TYPES.has(file.type)) {
      return NextResponse.json(
        { ok: false, message: "Only PNG and JPG/JPEG files are allowed." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { ok: false, message: "File size must be 5MB or less." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const stream = Readable.from(buffer);
    const bucket = await getGridFSBucket();
    const filename = `kyc-${session.user.id}-${Date.now()}-${file.name.replace(/\s+/g, "-")}`;

    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        contentType: file.type,
        originalName: file.name,
        size: file.size,
        userId: session.user.id,
        scope: "kyc-document",
      },
    });

    const fileId = await new Promise<string>((resolve, reject) => {
      stream
        .pipe(uploadStream)
        .on("error", (error) => reject(error))
        .on("finish", () => resolve(uploadStream.id.toString()));
    });

    return NextResponse.json(
      {
        ok: true,
        message: "KYC document uploaded.",
        fileId,
      },
      { status: 201 }
    );
  } catch (error) {
    const details = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json(
      { ok: false, message: "Unable to upload KYC document.", details },
      { status: 500 }
    );
  }
}
