import { NextResponse } from "next/server";
import { prisma, readSavedNumberPayload, serializeSavedNumber, toDate } from "@/lib/db";

export const runtime = "nodejs";

const DEFAULT_PAGE_SIZE = 8;
const MAX_PAGE_SIZE = 50;

function readPositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const search = (url.searchParams.get("search") || "").trim();
    const page = readPositiveInt(url.searchParams.get("page"), 1);
    const pageSize = Math.min(readPositiveInt(url.searchParams.get("pageSize"), DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
    const skip = (page - 1) * pageSize;

    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { phoneNumber: { contains: search } },
            { notes: { contains: search } }
          ]
        }
      : undefined;

    const [records, total] = await prisma.$transaction([
      prisma.savedNumber.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        skip,
        take: pageSize
      }),
      prisma.savedNumber.count({ where })
    ]);

    return NextResponse.json({
      records: records.map(serializeSavedNumber),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize))
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to load saved numbers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = readSavedNumberPayload((await request.json()) as Record<string, unknown>);
    const record = await prisma.savedNumber.create({
      data: {
        name: payload.name,
        phoneNumber: payload.phoneNumber,
        registrationDate: toDate(payload.registrationDate, "registrationDate"),
        insuranceDate: toDate(payload.insuranceDate, "insuranceDate"),
        birthday: toDate(payload.birthday, "birthday"),
        notes: payload.notes || null
      }
    });

    return NextResponse.json({ record: serializeSavedNumber(record) }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save number" },
      { status: 400 }
    );
  }
}
