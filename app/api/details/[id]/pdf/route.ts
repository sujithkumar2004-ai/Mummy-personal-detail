import { NextResponse } from "next/server";
import { ensureSchema, getPool, PdfRow } from "@/lib/db";
import { PDF_BUCKET, supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await ensureSchema();
    const pool = await getPool();
    const { rows } = await pool.query<PdfRow>(
      "SELECT pdf_name, pdf_type, pdf_path FROM personal_details WHERE id = $1",
      [id]
    );

    const pdf = rows[0];

    if (!pdf) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin.storage
      .from(PDF_BUCKET)
      .createSignedUrl(pdf.pdf_path, 60);

    if (error) {
      throw error;
    }

    return NextResponse.redirect(data.signedUrl);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to load PDF" }, { status: 500 });
  }
}
