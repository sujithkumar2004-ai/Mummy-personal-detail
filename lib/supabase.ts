import { createClient } from "@supabase/supabase-js";

export const PDF_BUCKET = "personal-detail-pdfs";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false
  }
});

let bucketReady = false;

export async function ensurePdfBucket() {
  if (bucketReady) {
    return;
  }

  const { error } = await supabaseAdmin.storage.createBucket(PDF_BUCKET, {
    public: false,
    fileSizeLimit: 25 * 1024 * 1024,
    allowedMimeTypes: ["application/pdf"]
  });

  if (error && !error.message.toLowerCase().includes("already exists")) {
    throw error;
  }

  bucketReady = true;
}
