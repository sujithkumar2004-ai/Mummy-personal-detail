import { NextResponse } from "next/server";
import { detailSelect, DetailRow, ensureSchema, getPool, serializeDetail } from "@/lib/db";

export const runtime = "nodejs";

function getRequiredText(payload: Record<string, unknown>, key: string) {
  const value = payload[key];

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${key} is required`);
  }

  return value.trim();
}
export async function GET() {
  try {
    await ensureSchema();
    const pool = await getPool();
    const { rows } = await pool.query<DetailRow>(`
      ${detailSelect}
      ORDER BY created_at DESC, id DESC
    `);

    return NextResponse.json({ details: rows.map(serializeDetail) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to load details" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const name = getRequiredText(payload, "name");
    const dob = getRequiredText(payload, "dob");
    const phone = getRequiredText(payload, "phone");
    const renewalDate = getRequiredText(payload, "renewalDate");
    const pdfName = getRequiredText(payload, "pdfName");
    const pdfType = getRequiredText(payload, "pdfType");
    const pdfPath = getRequiredText(payload, "pdfPath");
    await ensureSchema();
    const pool = await getPool();

    const { rows } = await pool.query<DetailRow>(
      `
        INSERT INTO personal_details
          (name, dob, phone, renewal_date, pdf_name, pdf_type, pdf_path)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7)
        RETURNING
          id,
          name,
          TO_CHAR(dob, 'YYYY-MM-DD') AS dob,
          phone,
          TO_CHAR(renewal_date, 'YYYY-MM-DD') AS renewal_date,
          pdf_name,
          pdf_type,
          pdf_path,
          created_at,
          updated_at
      `,
      [name, dob, phone, renewalDate, pdfName, pdfType, pdfPath]
    );

    return NextResponse.json({ detail: serializeDetail(rows[0]) }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save detail" },
      { status: 400 }
    );
  }
}
