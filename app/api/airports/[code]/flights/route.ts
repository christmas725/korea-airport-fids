import { NextRequest, NextResponse } from "next/server";
import { GET as getKacFlights } from "../../tae/flights/route";
import { airportByCode } from "@/lib/airports";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const preferredRegion = "icn1";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const airport = airportByCode(code);

  if (!airport || airport.source !== "kac") {
    return NextResponse.json({ error: "지원하지 않는 KAC 공항입니다." }, { status: 404 });
  }

  return getKacFlights(request);
}
