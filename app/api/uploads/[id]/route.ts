import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { getGridFSBucket, parseObjectId } from "@/lib/gridfs";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: Params) {
  try {
    const { id } = await params;
    const fileId = parseObjectId(id);
    const bucket = await getGridFSBucket();
    const files = await bucket.find({ _id: fileId }).toArray();

    if (!files.length) {
      return NextResponse.json(
        { ok: false, message: "File not found." },
        { status: 404 }
      );
    }

    const file = files[0];
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
      error instanceof Error ? error.message : "Unable to fetch file";
    return NextResponse.json(
      { ok: false, message: "Unable to fetch file.", details },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const { id } = await params;
    const fileId = parseObjectId(id);
    const bucket = await getGridFSBucket();

    await bucket.delete(fileId);

    return NextResponse.json(
      { ok: true, message: "File deleted from GridFS." },
      { status: 200 }
    );
  } catch (error) {
    const details =
      error instanceof Error ? error.message : "Unable to delete file";
    return NextResponse.json(
      { ok: false, message: "Unable to delete file.", details },
      { status: 500 }
    );
  }
}
