import { NextResponse } from "next/server";
import { createBooking } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ message: "Некорректный запрос" }, { status: 400 });
  const result = await createBooking(body);
  if (result.error) return NextResponse.json({ message: result.error }, { status: 409 });
  return NextResponse.json(result);
}
