import mysql from "mysql2/promise";

const database = process.env.MYSQL_DATABASE || "final_planner";

const baseConfig = {
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || ""
};

let pool: mysql.Pool | null = null;
let initialized = false;

export type DetailRow = {
  id: number;
  name: string;
  dob: string;
  phone: string;
  renewal_date: string;
  pdf_name: string;
  pdf_type: string;
  created_at: Date;
  updated_at: Date;
};

export type PdfRow = {
  pdf_name: string;
  pdf_type: string;
  pdf_data: Buffer;
};

async function initializeDatabase() {
  const connection = await mysql.createConnection(baseConfig);

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
  } finally {
    await connection.end();
  }
}

export async function getPool() {
  if (!initialized) {
    await initializeDatabase();
    initialized = true;
  }

  if (!pool) {
    pool = mysql.createPool({
      ...baseConfig,
      database,
      connectionLimit: 10,
      namedPlaceholders: true
    });

    await pool.query(`
      CREATE TABLE IF NOT EXISTS personal_details (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        dob DATE NOT NULL,
        phone VARCHAR(64) NOT NULL,
        renewal_date DATE NOT NULL,
        pdf_name VARCHAR(255) NOT NULL,
        pdf_type VARCHAR(120) NOT NULL,
        pdf_data LONGBLOB NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name),
        INDEX idx_phone (phone),
        INDEX idx_dob (dob),
        INDEX idx_renewal_date (renewal_date)
      )
    `);
  }

  return pool;
}

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
