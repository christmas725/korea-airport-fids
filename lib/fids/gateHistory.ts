export type GateHistorySnapshot = {
  previousGate?: string | null;
  currentGate?: string | null;
};

export function normalizedGate(value: string | null | undefined) {
  const gate = (value ?? "").trim();
  return gate && gate !== "-" && !/^N\/?A$/i.test(gate) ? gate : "";
}

/**
 * Prefer the server's latest transition only when it describes the gate that
 * is currently on screen. Otherwise preserve a usable previous gate supplied
 * by the live feed.
 */
export function resolvePreviousGate(
  displayedCurrentGate: string | null | undefined,
  feedPreviousGate: string | null | undefined,
  history?: GateHistorySnapshot
) {
  const displayedCurrent = normalizedGate(displayedCurrentGate);
  const feedPrevious = normalizedGate(feedPreviousGate);
  const historyCurrent = normalizedGate(history?.currentGate);
  const historyPrevious = normalizedGate(history?.previousGate);

  if (
    displayedCurrent &&
    historyCurrent === displayedCurrent &&
    historyPrevious &&
    historyPrevious !== historyCurrent
  ) {
    return historyPrevious;
  }

  return feedPrevious && feedPrevious !== displayedCurrent ? feedPrevious : "";
}
