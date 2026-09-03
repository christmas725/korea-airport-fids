export const DEFAULT_FIDS_ROWS = 14;
export const LARGE_TABLET_LANDSCAPE_ROWS = 16;
export const LARGE_TABLET_PORTRAIT_ROWS = 20;
export const MAX_FIDS_PAGES = 4;

export type FidsViewport = {
  viewportWidth: number;
  viewportHeight: number;
  screenWidth: number;
  screenHeight: number;
  coarsePointer: boolean;
  maxTouchPoints: number;
};

/**
 * Large tablets are detected from capabilities and CSS-pixel geometry instead
 * of a device model. The long-side floor deliberately excludes unfolded phone
 * foldables while retaining 8-inch-and-larger tablets and split-screen use.
 */
export function rowsForViewport(viewport: FidsViewport) {
  const touchCapable = viewport.coarsePointer || viewport.maxTouchPoints > 0;
  const shortScreenSide = Math.min(viewport.screenWidth, viewport.screenHeight);
  const longScreenSide = Math.max(viewport.screenWidth, viewport.screenHeight);
  const largeTouchTablet =
    touchCapable && shortScreenSide >= 760 && longScreenSide >= 1180;

  if (!largeTouchTablet) return DEFAULT_FIDS_ROWS;
  return viewport.viewportWidth >= viewport.viewportHeight
    ? LARGE_TABLET_LANDSCAPE_ROWS
    : LARGE_TABLET_PORTRAIT_ROWS;
}

export function paginateFidsRows<T>(items: T[], page: number, rowsPerPage: number) {
  const cappedItems = items.slice(0, rowsPerPage * MAX_FIDS_PAGES);
  const totalPages = Math.max(
    1,
    Math.min(MAX_FIDS_PAGES, Math.ceil(cappedItems.length / rowsPerPage))
  );
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  const start = safePage * rowsPerPage;
  const rows = cappedItems.slice(start, start + rowsPerPage);

  return {
    items: cappedItems,
    rows,
    page: safePage,
    totalPages,
    emptyRowCount: Math.max(0, rowsPerPage - rows.length),
  };
}
