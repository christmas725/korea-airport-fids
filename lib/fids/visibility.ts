export const COMPLETED_FLIGHT_GRACE_MS = 5 * 60_000;
export const OVERNIGHT_Y_FLIGHT_MAX_AGE_MS = 8 * 60 * 60_000;

type TimedFlight = {
  mode: "departures" | "arrivals";
  flightId?: string;
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

/**
 * FIDS에서 현재 운항으로 판단할 기준시각.
 *
 * 실제 완료시각이 있으면 그것을 우선하고, 없으면 변경/예상시각,
 * 마지막으로 예정시각을 사용한다. 이렇게 해야 조기 도착이나 지연처럼
 * 예정시각과 실제 표출시각이 달라진 운항도 현재시각 기준으로 올바르게 정리된다.
 */
export function flightDisplayDateTime(flight: TimedFlight) {
  return parseKstDateTime(
    flight.actualDateTime || flight.estimatedDateTime || flight.scheduleDateTime
  );
}

export function isOvernightYActiveFlight(
  flight: Pick<TimedFlight, "mode" | "flightId" | "remark">
) {
  if (flight.mode !== "departures") return false;

  const flightId = (flight.flightId ?? "").replace(/\s+/g, "").toUpperCase();
  // The airline designator occupies the first two characters. Only a Y in the
  // service-number portion marks the previous-day operation that crosses midnight.
  if (!flightId.slice(2).includes("Y")) return false;

  const status = flight.remark.trim().toLowerCase();
  return (
    status.includes("\uD0D1\uC2B9") ||
    status.includes("\uB9C8\uAC10") ||
    status.startsWith("\uCD9C\uBC1C") ||
    /gate\s*change|gate\s*open|ready|boarding|final\s*call|gate\s*(closing|closed)|departed/.test(status)
  );
}

/**
 * 현재시각 기준 FIDS 노출 여부.
 *
 * 과거 구현은 '출발/도착 완료' 상태인 편만 5분 뒤 제거했기 때문에,
 * KAC가 과거 운항편에 지연/탑승중/빈 상태를 남기면 아침 편이 오후에도
 * 계속 첫 페이지에 남는 문제가 있었다. 상태 문구와 무관하게 실제/예상/예정
 * 시각 중 가장 신뢰할 수 있는 표출시각을 기준으로 현재보다 5분 이상 지난 편은
 * 제외한다. 5분 유예는 상태 갱신과 화면 폴링 사이의 짧은 지연을 흡수한다.
 */
export function isWithinCompletedFlightGrace(
  flight: TimedFlight,
  now = Date.now(),
  graceMs = COMPLETED_FLIGHT_GRACE_MS
) {
  if (isOvernightYActiveFlight(flight)) {
    const scheduledAt = parseKstDateTime(flight.scheduleDateTime)?.getTime();
    if (typeof scheduledAt === "number") {
      return now - scheduledAt <= OVERNIGHT_Y_FLIGHT_MAX_AGE_MS;
    }
  }

  const displayAt = flightDisplayDateTime(flight)?.getTime();
  return typeof displayAt === "number" && displayAt >= now - graceMs;
}
