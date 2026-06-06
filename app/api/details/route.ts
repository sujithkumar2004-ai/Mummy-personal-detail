import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { DetailRow, getPool, serializeDetail } from "@/lib/db";

export const runtime = "nodejs";

type DetailPacket = DetailRow & RowDataPacket;

function getRequiredText(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${key} is required`);
  }

  return value.trim();
}

async function getPdfPayload(formData: FormData) {
  const pdf = formData.get("pdf");

  if (!(pdf instanceof File) || pdf.size === 0) {
    throw new Error("pdf is required");
  }

  if (pdf.type && pdf.type !== "application/pdf") {
    throw new Error("Only PDF uploads are supported");
  }

  return {
    name: pdf.name,
    type: pdf.type || "application/pdf",
    data: Buffer.from(await pdf.arrayBuffer())
  };
}

export async function GET() {
  try {
    const pool = await getPool();
    const [rows] = await pool.query<DetailPacket[]>(`
      SELECT
        id,
        name,
        DATE_FORMAT(dob, '%Y-%m-%d') AS dob,
        phone,
        DATE_FORMAT(renewal_date, '%Y-%m-%d') AS renewal_date,
        pdf_name,
        pdf_type,
        created_at,
        updated_at
      FROM personal_details
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
    const formData = await request.formData();
    const name = getRequiredText(formData, "name");
    const dob = getRequiredText(formData, "dob");
    const phone = getRequiredText(formData, "phone");
    const renewalDate = getRequiredText(formData, "renewalDate");
    const pdf = await getPdfPayload(formData);
    const pool = await getPool();

    const [result] = await pool.execute(
      `
        INSERT INTO personal_details
          (name, dob, phone, renewal_date, pdf_name, pdf_type, pdf_data)
        VALUES
          (?, ?, ?, ?, ?, ?, ?)
      `,
      [name, dob, phone, renewalDate, pdf.name, pdf.type, pdf.data]
    );

    const insertId = Number((result as { insertId: number }).insertId);
    const [rows] = await pool.query<DetailPacket[]>(
      `
        SELECT
          id,
          name,
          DATE_FORMAT(dob, '%Y-%m-%d') AS dob,
          phone,
          DATE_FORMAT(renewal_date, '%Y-%m-%d') AS renewal_date,
          pdf_name,
          pdf_type,
          created_at,
          updated_at
        FROM personal_details
        WHERE id = ?
      `,
      [insertId]
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
