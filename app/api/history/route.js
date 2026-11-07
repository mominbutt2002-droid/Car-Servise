import { NextResponse } from "next/server";
import { history } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const carId = Number(new URL(request.url).searchParams.get("carId"));
  if (!carId) {
    return NextResponse.json({ message: "Не выбран автомобиль" }, { status: 400 });
  }
  return NextResponse.json({ visits: await history(carId) });
}
