import { NextResponse } from "next/server";
import { ensureSchema, getPool, PdfRow } from "@/lib/db";

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
      "SELECT pdf_name, pdf_type, pdf_data FROM personal_details WHERE id = $1",
      [id]
    );

    const pdf = rows[0];

    if (!pdf) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 });
    }

    const body = new Uint8Array(pdf.pdf_data);

    return new Response(body, {
      headers: {
        "Content-Type": pdf.pdf_type || "application/pdf",
        "Content-Disposition": `inline; filename="${encodeURIComponent(pdf.pdf_name)}"`
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to load PDF" }, { status: 500 });
  }
}
