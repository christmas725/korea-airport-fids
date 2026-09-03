export const COMPLETED_FLIGHT_GRACE_MS = 5 * 60_000;

type TimedFlight = {
  mode: "departures" | "arrivals";
  remark: string;
  scheduleDateTime: string;
  estimatedDateTime?: string;
  actualDateTime?: string;
};

export function parseKstDateTime(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 12) return null;

  return new Date(
    Date.UTC(
      Number(digits.slice(0, 4)),
      Number(digits.slice(4, 6)) - 1,
      Number(digits.slice(6, 8)),
      Number(digits.slice(8, 10)) - 9,
      Number(digits.slice(10, 12))
    )
  );
}

export function isCompletedFlight(flight: Pick<TimedFlight, "mode" | "remark">) {
  const status = flight.remark.replace(/\s/g, "");
  return flight.mode === "departures"
    ? /^(출발|출발완료|departed)$/i.test(status)
    : /^(도착|도착완료|arrived)$/i.test(status);
}

export function isWithinCompletedFlightGrace(
  flight: TimedFlight,
  now = Date.now(),
  graceMs = COMPLETED_FLIGHT_GRACE_MS
) {
  if (!isCompletedFlight(flight)) return true;

  const completedAt = parseKstDateTime(
    flight.actualDateTime || flight.estimatedDateTime || flight.scheduleDateTime
  )?.getTime();

  return typeof completedAt === "number" && completedAt >= now - graceMs;
}
