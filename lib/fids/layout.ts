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
  noHover?: boolean;
  maxTouchPoints: number;
};

/**
 * Large tablets are detected from capabilities and CSS-pixel geometry instead
 * of a device model. The long-side floor deliberately excludes unfolded phone
 * foldables while retaining 8-inch-and-larger tablets and split-screen use.
 */
export function rowsForViewport(viewport: FidsViewport) {
  const tabletPointer = viewport.coarsePointer || viewport.noHover === true;
  const shortScreenSide = Math.min(viewport.screenWidth, viewport.screenHeight);
  const longScreenSide = Math.max(viewport.screenWidth, viewport.screenHeight);
  const largeTouchScreen =
    tabletPointer && shortScreenSide >= 760 && longScreenSide >= 1180;

  if (!largeTouchScreen) return DEFAULT_FIDS_ROWS;

  // Keep the runtime row count aligned with the tablet media queries.
  // A Windows desktop can report touch points while its primary pointer still
  // behaves like a mouse; that must remain on the 14-row desktop layout.
  if (viewport.viewportWidth >= 1101 && viewport.viewportWidth <= 1700) {
    return LARGE_TABLET_LANDSCAPE_ROWS;
  }

  const portraitTablet =
    viewport.viewportWidth >= 800 &&
    viewport.viewportWidth <= 1100 &&
    viewport.viewportWidth < viewport.viewportHeight &&
    viewport.viewportWidth / viewport.viewportHeight <= 3 / 4;

  return portraitTablet ? LARGE_TABLET_PORTRAIT_ROWS : DEFAULT_FIDS_ROWS;
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
