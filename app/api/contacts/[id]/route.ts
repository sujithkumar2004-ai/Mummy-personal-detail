import { NextResponse } from "next/server";
import { prisma, readSavedNumberPayload, serializeSavedNumber, toDate } from "@/lib/db";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function readId(value: string) {
  const id = Number(value);

  if (!Number.isInteger(id) || id < 1) {
    throw new Error("Invalid record id");
  }

  return id;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const record = await prisma.savedNumber.findUnique({ where: { id: readId(id) } });

    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json({ record: serializeSavedNumber(record) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to load record" }, { status: 400 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const payload = readSavedNumberPayload((await request.json()) as Record<string, unknown>);
    const record = await prisma.savedNumber.update({
      where: { id: readId(id) },
      data: {
        name: payload.name,
        phoneNumber: payload.phoneNumber,
        registrationDate: toDate(payload.registrationDate, "registrationDate"),
        insuranceDate: toDate(payload.insuranceDate, "insuranceDate"),
        birthday: toDate(payload.birthday, "birthday"),
        notes: payload.notes || null
      }
    });

    return NextResponse.json({ record: serializeSavedNumber(record) });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update record" },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await prisma.savedNumber.delete({ where: { id: readId(id) } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to delete record" }, { status: 400 });
  }
}
