import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json({ error: "PDF uploads are not part of the Number Saving Platform" }, { status: 410 });
}
