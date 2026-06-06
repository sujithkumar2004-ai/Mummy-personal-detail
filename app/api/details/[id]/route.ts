import { NextResponse } from "next/server";
import { DetailRow, ensureSchema, getPool, serializeDetail } from "@/lib/db";

export const runtime = "nodejs";

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
    await ensureSchema();
    const pool = await getPool();
    let rows: DetailRow[];

    if (pdf) {
      ({ rows } = await pool.query<DetailRow>(
        `
          UPDATE personal_details
          SET
            name = $1,
            dob = $2,
            phone = $3,
            renewal_date = $4,
            pdf_name = $5,
            pdf_type = $6,
            pdf_data = $7,
            updated_at = NOW()
          WHERE id = $8
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
        [name, dob, phone, renewalDate, pdf.name, pdf.type, pdf.data, id]
      ));
    } else {
      ({ rows } = await pool.query<DetailRow>(
        `
          UPDATE personal_details
          SET
            name = $1,
            dob = $2,
            phone = $3,
            renewal_date = $4,
            updated_at = NOW()
          WHERE id = $5
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
        [name, dob, phone, renewalDate, id]
      ));
    }

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
