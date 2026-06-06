import { NextResponse } from "next/server";
import { DetailRow, ensureSchema, getPool, serializeDetail } from "@/lib/db";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function getRequiredText(payload: Record<string, unknown>, key: string) {
  const value = payload[key];

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${key} is required`);
  }

  return value.trim();
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const payload = (await request.json()) as Record<string, unknown>;
    const name = getRequiredText(payload, "name");
    const dob = getRequiredText(payload, "dob");
    const phone = getRequiredText(payload, "phone");
    const renewalDate = getRequiredText(payload, "renewalDate");
    const pdfName = typeof payload.pdfName === "string" ? payload.pdfName.trim() : "";
    const pdfType = typeof payload.pdfType === "string" ? payload.pdfType.trim() : "";
    const pdfPath = typeof payload.pdfPath === "string" ? payload.pdfPath.trim() : "";
    await ensureSchema();
    const pool = await getPool();
    let rows: DetailRow[];

    if (pdfPath) {
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
            pdf_path = $7,
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
            pdf_path,
            created_at,
            updated_at
        `,
        [name, dob, phone, renewalDate, pdfName, pdfType || "application/pdf", pdfPath, id]
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
            pdf_path,
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
