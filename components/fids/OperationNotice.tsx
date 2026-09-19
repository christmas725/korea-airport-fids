type OperationNoticeProps = {
  suspended?: boolean;
};

const endedCopy = {
  ko: "금일 운항편은 모두 종료되었습니다.",
  en: "All flights for today have concluded.",
  ja: "本日の運航便はすべて終了しました。",
  zh: "今日航班已全部结束。",
};

const suspendedCopy = {
  ko: "해당 공항은 현재 임시 운영중단 중입니다.",
  en: "Flight operations at this airport are temporarily suspended.",
  ja: "当空港は現在、運航を一時休止しています。",
  zh: "本机场目前暂时停止航班运营。",
};

export default function OperationNotice({ suspended = false }: OperationNoticeProps) {
  const copy = suspended ? suspendedCopy : endedCopy;

  return (
    <div
      className={`operation-notice ${suspended ? "operation-notice-suspended" : "operation-notice-ended"}`}
      role="status"
      aria-live="polite"
    >
      <div className="operation-notice-card">
        <div className="operation-notice-kicker">
          <span>{suspended ? "운영 안내" : "운항 안내"}</span>
          <span>{suspended ? "OPERATION NOTICE" : "FLIGHT NOTICE"}</span>
        </div>
        <strong className="operation-notice-ko" lang="ko">{copy.ko}</strong>
        <span className="operation-notice-en" lang="en">{copy.en}</span>
        <span className="operation-notice-ja" lang="ja">{copy.ja}</span>
        <span className="operation-notice-zh" lang="zh-CN">{copy.zh}</span>
      </div>
    </div>
  );
}
