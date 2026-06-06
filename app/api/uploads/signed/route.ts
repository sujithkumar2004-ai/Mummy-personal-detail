import { NextResponse } from "next/server";
import { ensurePdfBucket, PDF_BUCKET, supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

function cleanFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { fileName?: string; contentType?: string };

    if (!payload.fileName) {
      return NextResponse.json({ error: "fileName is required" }, { status: 400 });
    }

    if (payload.contentType && payload.contentType !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF uploads are supported" }, { status: 400 });
    }

    await ensurePdfBucket();

    const path = `${Date.now()}-${crypto.randomUUID()}-${cleanFileName(payload.fileName)}`;
    const { data, error } = await supabaseAdmin.storage
      .from(PDF_BUCKET)
      .createSignedUploadUrl(path);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      bucket: PDF_BUCKET,
      path,
      token: data.token
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to create upload URL" }, { status: 500 });
  }
}
