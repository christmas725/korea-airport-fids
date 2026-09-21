type OperationNoticeProps = {
  suspended?: boolean;
  preparing?: boolean;
};

const endedCopy = {
  ko: "금일 운항편은 모두 종료되었습니다.",
  en: "All flights for today have concluded.",
  ja: "本日の運航便はすべて終了しました。",
  zh: "今日航班已全部结束。",
};

const preparingCopy = {
  ko: "금일 항공편은 운항 준비중입니다.",
  en: "Today's flights are being prepared for operation.",
  ja: "本日の運航便は現在、運航準備中です。",
  zh: "今日航班正在进行运行准备。",
};

const suspendedCopy = {
  ko: "해당 공항은 현재 임시 운영중단 중입니다.",
  en: "Flight operations at this airport are temporarily suspended.",
  ja: "当空港は現在、運航を一時休止しています。",
  zh: "本机场目前暂时停止航班运营。",
};

const suspensionPeriodCopy = {
  ko: "운항 중단 일시 : 2024년 12월 29일 ~ 미정",
  en: "Suspension period: December 29, 2024 ~ Until further notice",
  ja: "運航休止期間：2024年12月29日 ～ 未定",
  zh: "停航期间：2024年12月29日 ～ 待定",
};

export default function OperationNotice({ suspended = false, preparing = false }: OperationNoticeProps) {
  const copy = suspended ? suspendedCopy : preparing ? preparingCopy : endedCopy;
  const noticeClass = suspended
    ? "operation-notice-suspended"
    : preparing
      ? "operation-notice-preparing"
      : "operation-notice-ended";

  return (
    <div
      className={`operation-notice ${noticeClass}`}
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
        {suspended && (
          <div className="operation-notice-period">
            <strong lang="ko">{suspensionPeriodCopy.ko}</strong>
            <span lang="en">{suspensionPeriodCopy.en}</span>
            <span lang="ja">{suspensionPeriodCopy.ja}</span>
            <span lang="zh-CN">{suspensionPeriodCopy.zh}</span>
          </div>
        )}
      </div>
    </div>
  );
}
