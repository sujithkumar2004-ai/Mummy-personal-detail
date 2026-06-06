import { Pool } from "pg";

const rawConnectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!rawConnectionString) {
  throw new Error("POSTGRES_URL or DATABASE_URL is required");
}

const connectionUrl = new URL(rawConnectionString);
connectionUrl.searchParams.delete("sslmode");
connectionUrl.searchParams.delete("sslcert");
connectionUrl.searchParams.delete("sslkey");
connectionUrl.searchParams.delete("sslrootcert");
const connectionString = connectionUrl.toString();

let pool: Pool | null = null;
let initialized = false;

export type DetailRow = {
  id: string | number;
  name: string;
  dob: string;
  phone: string;
  renewal_date: string;
  pdf_name: string;
  pdf_type: string;
  pdf_path: string;
  created_at: Date;
  updated_at: Date;
};

export type PdfRow = {
  pdf_name: string;
  pdf_type: string;
  pdf_path: string;
};

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    });
  }

  return pool;
}

export async function ensureSchema() {
  if (initialized) {
    return;
  }

  await getPool().query(`
    CREATE TABLE IF NOT EXISTS personal_details (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      dob DATE NOT NULL,
      phone VARCHAR(64) NOT NULL,
      renewal_date DATE NOT NULL,
      pdf_name VARCHAR(255) NOT NULL,
      pdf_type VARCHAR(120) NOT NULL,
      pdf_path TEXT,
      pdf_data BYTEA,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE personal_details ADD COLUMN IF NOT EXISTS pdf_path TEXT;
    ALTER TABLE personal_details ALTER COLUMN pdf_data DROP NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_personal_details_name ON personal_details (name);
    CREATE INDEX IF NOT EXISTS idx_personal_details_phone ON personal_details (phone);
    CREATE INDEX IF NOT EXISTS idx_personal_details_dob ON personal_details (dob);
    CREATE INDEX IF NOT EXISTS idx_personal_details_renewal_date ON personal_details (renewal_date);
  `);

  initialized = true;
}

export const detailSelect = `
  SELECT
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
  FROM personal_details
`;

export function serializeDetail(row: DetailRow) {
  return {
    id: Number(row.id),
    name: row.name,
    dob: row.dob,
    phone: row.phone,
    renewalDate: row.renewal_date,
    pdfName: row.pdf_name,
    pdfUrl: `/api/details/${row.id}/pdf`,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
