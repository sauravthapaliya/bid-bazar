import { GridFSBucket, ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";

const BUCKET_NAME = "productImages";

export async function getGridFSBucket() {
  const { db } = await connectToDatabase();
  return new GridFSBucket(db, { bucketName: BUCKET_NAME });
}

export function parseObjectId(id: string) {
  if (!ObjectId.isValid(id)) {
    throw new Error("Invalid file id.");
  }

  return new ObjectId(id);
}
