import { PrismaClient, SavedNumber } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export type SavedNumberPayload = {
  name: string;
  phoneNumber: string;
  registrationDate: string;
  insuranceDate: string;
  birthday: string;
  notes: string;
};

export function toDate(value: string, fieldName: string) {
  if (!value || Number.isNaN(Date.parse(value))) {
    throw new Error(`${fieldName} is required`);
  }

  return new Date(`${value}T00:00:00.000Z`);
}

export function requireText(payload: Record<string, unknown>, key: string) {
  const value = payload[key];

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${key} is required`);
  }

  return value.trim();
}

export function optionalText(payload: Record<string, unknown>, key: string) {
  const value = payload[key];

  return typeof value === "string" ? value.trim() : "";
}

export function readSavedNumberPayload(payload: Record<string, unknown>): SavedNumberPayload {
  return {
    name: requireText(payload, "name"),
    phoneNumber: requireText(payload, "phoneNumber"),
    registrationDate: requireText(payload, "registrationDate"),
    insuranceDate: requireText(payload, "insuranceDate"),
    birthday: requireText(payload, "birthday"),
    notes: optionalText(payload, "notes")
  };
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function serializeSavedNumber(record: SavedNumber) {
  return {
    id: record.id,
    name: record.name,
    phoneNumber: record.phoneNumber,
    registrationDate: formatDate(record.registrationDate),
    insuranceDate: formatDate(record.insuranceDate),
    birthday: formatDate(record.birthday),
    notes: record.notes ?? "",
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}
