import { NextResponse } from "next/server";
import { detailSelect, DetailRow, ensureSchema, getPool, serializeDetail } from "@/lib/db";

export const runtime = "nodejs";

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
    const formData = await request.formData();
    const name = getRequiredText(formData, "name");
    const dob = getRequiredText(formData, "dob");
    const phone = getRequiredText(formData, "phone");
    const renewalDate = getRequiredText(formData, "renewalDate");
    const pdf = await getPdfPayload(formData);
    await ensureSchema();
    const pool = await getPool();

    const { rows } = await pool.query<DetailRow>(
      `
        INSERT INTO personal_details
          (name, dob, phone, renewal_date, pdf_name, pdf_type, pdf_data)
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
          created_at,
          updated_at
      `,
      [name, dob, phone, renewalDate, pdf.name, pdf.type, pdf.data]
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
