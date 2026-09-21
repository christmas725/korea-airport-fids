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

      const [hour = "00", minute = "00", second = "00"] = formatClock(new Date()).split(":");
      const main = `${hour}:${minute}`;
      const seconds = `:${second}`;

      document.querySelectorAll<HTMLElement>(".rail-time > strong").forEach((element) => {
        if (element.textContent !== main) element.textContent = main;
        if (element.dataset.seconds !== seconds) element.dataset.seconds = seconds;
      });

      applying = false;
    };

    updateClock();

    // 각 FIDS React 시계가 매초 HH:MM을 다시 렌더링한 직후 초 단위를 재적용한다.
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
