import { NextResponse } from "next/server";
import { listSlots } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const masterId = Number(new URL(request.url).searchParams.get("masterId"));
  if (!masterId) {
    return NextResponse.json({ message: "Не выбран мастер" }, { status: 400 });
  }
  return NextResponse.json({ slots: await listSlots(masterId) });
}
