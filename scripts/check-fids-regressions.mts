import assert from "node:assert/strict";
import {
  SHARED_DESTINATION_EN,
  SHARED_DESTINATION_KO,
  SHARED_DESTINATION_LOCAL,
  SHARED_DESTINATION_LOCALE,
} from "../lib/fids/destinationOverrides.ts";
import { resolvePreviousGate } from "../lib/fids/gateHistory.ts";
import { getKacModeWindowState } from "../lib/fids/operationWindow.ts";
import {
  isOvernightYActiveFlight,
  isOvernightYFlightId,
  isWithinCompletedFlightGrace,
} from "../lib/fids/visibility.ts";

const destinations = {
  HPH: ["하이퐁", "HAI PHONG", "HẢI PHÒNG", "vi"],
  CIT: ["쉼켄트", "SHYMKENT", "ШЫМКЕНТ", "kk"],
  ADD: ["아디스아바바", "ADDIS ABABA", "አዲስ አበባ", "am"],
} as const;

for (const [code, expected] of Object.entries(destinations)) {
  assert.deepEqual(
    [
      SHARED_DESTINATION_KO[code],
      SHARED_DESTINATION_EN[code],
      SHARED_DESTINATION_LOCAL[code],
      SHARED_DESTINATION_LOCALE[code],
    ],
    expected,
    `${code} destination fallback`
  );
}

assert.equal(resolvePreviousGate("257", "252", { previousGate: "252", currentGate: "257" }), "252");
assert.equal(resolvePreviousGate("261", "252", { previousGate: "257", currentGate: "261" }), "257");
assert.equal(resolvePreviousGate("261", "252", { previousGate: "257", currentGate: "257" }), "252");
assert.equal(resolvePreviousGate("261", "257"), "257");
assert.equal(resolvePreviousGate("261", "261"), "");

assert.equal(isOvernightYFlightId("ZE 781Y"), true);
assert.equal(isOvernightYFlightId("YP101"), false, "airline designator Y is not an overnight suffix");
for (const remark of ["게이트 변경", "탑승준비", "탑승중", "탑승마감", "출발"]) {
  assert.equal(
    isOvernightYActiveFlight({ mode: "departures", flightId: "ZE781Y", remark }),
    true,
    `active overnight status: ${remark}`
  );
}
assert.equal(
  isOvernightYActiveFlight({ mode: "arrivals", flightId: "ZE781Y", remark: "도착" }),
  false
);

const overnightFlight = {
  mode: "departures" as const,
  flightId: "ZE781Y",
  remark: "출발",
  scheduleDateTime: "202609242330",
};
assert.equal(
  isWithinCompletedFlightGrace(overnightFlight, Date.UTC(2026, 8, 24, 16, 0)),
  true,
  "Y flight stays visible at 01:00 KST"
);
assert.equal(
  isWithinCompletedFlightGrace(overnightFlight, Date.UTC(2026, 8, 24, 23, 0)),
  false,
  "Y flight expires after the eight-hour safety window"
);
assert.equal(
  getKacModeWindowState(
    "departures",
    "GMP",
    new Date(Date.UTC(2026, 8, 24, 15, 10)),
    [{ ...overnightFlight, estimatedDateTime: "202609250015" }]
  ),
  "active",
  "active overnight Y flight keeps the KAC departure board open after midnight"
);

console.log("FIDS regression checks passed");
