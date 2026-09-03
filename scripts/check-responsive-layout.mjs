import assert from "node:assert/strict";
import {
  MAX_FIDS_PAGES,
  paginateFidsRows,
  rowsForViewport,
} from "../lib/fids/layout.ts";
import {
  isCompletedFlight,
  isWithinCompletedFlightGrace,
} from "../lib/fids/visibility.ts";

const scenarios = [
  ["desktop maximized", 1920, 950, 1920, 1080, false, false, 0, 14],
  ["touch desktop maximized", 1878, 926, 1920, 1080, false, false, 10, 14],
  ["smartphone portrait", 390, 844, 390, 844, true, true, 5, 14],
  ["smartphone landscape", 844, 390, 390, 844, true, true, 5, 14],
  ["fold cover", 344, 882, 344, 882, true, true, 5, 14],
  ["fold unfolded", 884, 1104, 884, 1104, true, true, 5, 14],
  ["large tablet landscape", 1280, 800, 1280, 800, true, true, 10, 16],
  ["large tablet portrait", 800, 1280, 800, 1280, true, true, 10, 20],
];

for (const [name, viewportWidth, viewportHeight, screenWidth, screenHeight, coarsePointer, noHover, maxTouchPoints, expected] of scenarios) {
  assert.equal(
    rowsForViewport({
      viewportWidth,
      viewportHeight,
      screenWidth,
      screenHeight,
      coarsePointer,
      noHover,
      maxTouchPoints,
    }),
    expected,
    name
  );
}

for (const rowsPerPage of [14, 16, 20]) {
  const items = Array.from({ length: rowsPerPage * MAX_FIDS_PAGES + 7 }, (_, index) => index);
  const last = paginateFidsRows(items, 3, rowsPerPage);
  assert.equal(last.totalPages, 4);
  assert.equal(last.items.length, rowsPerPage * 4);
  assert.equal(last.rows.length + last.emptyRowCount, rowsPerPage);
}

const now = Date.UTC(2026, 8, 3, 5, 30);
const baseFlight = {
  scheduleDateTime: "202609031400",
  estimatedDateTime: "202609031425",
  actualDateTime: "202609031425",
};

assert.equal(isCompletedFlight({ mode: "departures", remark: "출발" }), true);
assert.equal(isCompletedFlight({ mode: "arrivals", remark: "도착" }), true);
assert.equal(isCompletedFlight({ mode: "arrivals", remark: "예정" }), false);
assert.equal(
  isWithinCompletedFlightGrace(
    { ...baseFlight, mode: "arrivals", remark: "도착" },
    now
  ),
  true
);
assert.equal(
  isWithinCompletedFlightGrace(
    {
      ...baseFlight,
      mode: "arrivals",
      remark: "도착",
      actualDateTime: "202609031420",
    },
    now
  ),
  false
);

console.log("8개 화면 정책, 14·16·20행/4페이지 제한, 출발·도착 완료편 5분 유지 기준 검증을 통과했습니다.");
