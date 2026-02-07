import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    await client.db().command({ ping: 1 });

    return NextResponse.json(
      {
        ok: true,
        status: "healthy",
        message: "✅ Successfully connected to MongoDB.",
      },
      { status: 200 },
    );
  } catch (error) {
    const details =
      error instanceof Error
        ? error.message
        : "An unexpected error occurred while connecting to MongoDB.";

    return NextResponse.json(
      {
        ok: false,
        status: "unhealthy",
        message: "Unable to establish a connection with MongoDB.",
        error: details,
      },
      { status: 500 },
    );
  }
}
