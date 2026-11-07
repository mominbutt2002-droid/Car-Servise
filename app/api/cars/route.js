import { NextResponse } from "next/server";
import { createCar } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ message: "Некорректный запрос" }, { status: 400 });
  const result = await createCar(body);
  if (result.error) return NextResponse.json({ message: result.error }, { status: 400 });
  return NextResponse.json(result);
}
