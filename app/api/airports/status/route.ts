import { NextResponse } from "next/server";
import { getInitialAirportStatuses } from "@/lib/fids/serverAirportStatuses";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  const statuses = await getInitialAirportStatuses(650);

  return NextResponse.json(
    {
      statuses,
      updatedAt: new Date().toISOString(),
      elapsedMs: Date.now() - startedAt,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
