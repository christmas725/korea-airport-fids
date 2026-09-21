"use client";

import { useEffect } from "react";

function formatClock(value: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(value);
}

export default function FidsSecondClock() {
  useEffect(() => {
    let applying = false;

    const updateClock = () => {
      if (applying) return;
      applying = true;

      const clock = formatClock(new Date());
      document.querySelectorAll<HTMLElement>(".rail-time > strong").forEach((element) => {
        if (element.textContent !== clock) element.textContent = clock;
      });

      applying = false;
    };

    updateClock();

    // FIDS 자체 시계도 매초 React로 갱신되므로 DOM 갱신 직후 초 단위를 다시 적용한다.
    const observer = new MutationObserver(() => {
      if (!applying) queueMicrotask(updateClock);
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
    });

    const interval = window.setInterval(updateClock, 250);

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
