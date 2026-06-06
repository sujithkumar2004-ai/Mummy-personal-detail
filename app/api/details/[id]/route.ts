import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { DetailRow, getPool, serializeDetail } from "@/lib/db";

export const runtime = "nodejs";

type DetailPacket = DetailRow & RowDataPacket;

type RouteContext = {
  params: Promise<{ id: string }>;
};

function getRequiredText(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${key} is required`);
  }

  return value.trim();
}

async function getOptionalPdfPayload(formData: FormData) {
  const pdf = formData.get("pdf");

  if (!(pdf instanceof File) || pdf.size === 0) {
    return null;
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

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const formData = await request.formData();
    const name = getRequiredText(formData, "name");
    const dob = getRequiredText(formData, "dob");
    const phone = getRequiredText(formData, "phone");
    const renewalDate = getRequiredText(formData, "renewalDate");
    const pdf = await getOptionalPdfPayload(formData);
    const pool = await getPool();

    if (pdf) {
      await pool.execute(
        `
          UPDATE personal_details
          SET name = ?, dob = ?, phone = ?, renewal_date = ?, pdf_name = ?, pdf_type = ?, pdf_data = ?
          WHERE id = ?
        `,
        [name, dob, phone, renewalDate, pdf.name, pdf.type, pdf.data, id]
      );
    } else {
      await pool.execute(
        `
          UPDATE personal_details
          SET name = ?, dob = ?, phone = ?, renewal_date = ?
          WHERE id = ?
        `,
        [name, dob, phone, renewalDate, id]
      );
    }

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
      [id]
    );

    if (!rows[0]) {
      return NextResponse.json({ error: "Detail not found" }, { status: 404 });
    }

    return NextResponse.json({ detail: serializeDetail(rows[0]) });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update detail" },
      { status: 400 }
    );
  }
}
