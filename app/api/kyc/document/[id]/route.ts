import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { auth } from "@/auth";
import { getGridFSBucket, parseObjectId } from "@/lib/gridfs";
import { getCurrentUserRecord, isAdmin } from "@/lib/user-auth";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    const viewer = await getCurrentUserRecord();
    if (!viewer) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    const { id } = await params;
    const fileId = parseObjectId(id);
    const bucket = await getGridFSBucket();
    const files = await bucket.find({ _id: fileId }).toArray();

    if (!files.length) {
      return NextResponse.json(
        { ok: false, message: "KYC document not found." },
        { status: 404 }
      );
    }

    const file = files[0];
    const scope = file.metadata?.scope;
    const ownerId = file.metadata?.userId;
    const canRead = isAdmin(viewer) || (typeof ownerId === "string" && ownerId === viewer.id);

    if (scope !== "kyc-document" || !canRead) {
      return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
    }

    const downloadStream = bucket.openDownloadStream(fileId);
    return new NextResponse(Readable.toWeb(downloadStream) as ReadableStream, {
      headers: {
        "Content-Type":
          (file.metadata?.contentType as string | undefined) ||
          "application/octet-stream",
        "Content-Disposition": `inline; filename="${file.filename}"`,
      },
    });
  } catch (error) {
    const details =
      error instanceof Error ? error.message : "Unable to fetch KYC document";
    return NextResponse.json(
      { ok: false, message: "Unable to fetch KYC document.", details },
      { status: 500 }
    );
  }
}
