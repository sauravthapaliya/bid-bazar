import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { getGridFSBucket } from "@/lib/gridfs";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, message: "Missing file. Use form-data key: file" },
        { status: 400 }
      );
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json(
        { ok: false, message: "Only jpeg, png, webp, and gif are allowed." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const stream = Readable.from(buffer);
    const bucket = await getGridFSBucket();
    const filename = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;

    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        contentType: file.type,
        originalName: file.name,
        size: file.size,
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
        message: "File uploaded to MongoDB GridFS.",
        fileId,
      },
      { status: 201 }
    );
  } catch (error) {
    const details = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json(
      { ok: false, message: "Unable to upload file.", details },
      { status: 500 }
    );
  }
}
