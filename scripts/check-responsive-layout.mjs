import assert from "node:assert/strict";
import {
  MAX_FIDS_PAGES,
  paginateFidsRows,
  rowsForViewport,
} from "../lib/fids/layout.ts";

const scenarios = [
  ["desktop maximized", 1920, 950, 1920, 1080, false, 0, 14],
  ["smartphone portrait", 390, 844, 390, 844, true, 5, 14],
  ["smartphone landscape", 844, 390, 390, 844, true, 5, 14],
  ["fold cover", 344, 882, 344, 882, true, 5, 14],
  ["fold unfolded", 884, 1104, 884, 1104, true, 5, 14],
  ["large tablet landscape", 1280, 800, 1280, 800, true, 10, 16],
  ["large tablet portrait", 800, 1280, 800, 1280, true, 10, 20],
];

for (const [name, viewportWidth, viewportHeight, screenWidth, screenHeight, coarsePointer, maxTouchPoints, expected] of scenarios) {
  assert.equal(
    rowsForViewport({
      viewportWidth,
      viewportHeight,
      screenWidth,
      screenHeight,
      coarsePointer,
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

console.log("7개 화면 정책과 14·16·20행/4페이지 제한 검증을 통과했습니다.");
