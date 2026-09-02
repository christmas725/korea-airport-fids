import { airports, regions } from "@/lib/airports";

export default function Home() {
  const liveCount = airports.filter((airport) => airport.status === "live").length;

  return (
    <main className="directory-shell">
      <header className="directory-header">
        <div>
          <p className="eyebrow">KOREA AIRPORT FLIGHT INFORMATION</p>
          <h1>대한민국 국내공항 통합 FIDS</h1>
          <p className="directory-intro">
            공항을 선택하면 실시간 운항정보 전광판으로 이동합니다.
          </p>
        </div>
        <div className="network-status" aria-label={`${airports.length}개 공항 중 ${liveCount}개 운영 중`}>
          <span className="status-light" />
          <strong>{liveCount}</strong>
          <span>/ {airports.length} AIRPORTS LIVE</span>
        </div>
      </header>

      <section className="live-strip" aria-label="현재 이용 가능한 공항">
        <span>NOW BOARDING</span>
        <p>인천 ICN · 대구 TAE FIDS 운영 중</p>
      </section>

      <div className="region-list">
        {regions.map((region) => {
          const regionAirports = airports.filter((airport) => airport.region === region);
          return (
            <section className="region-section" key={region}>
              <div className="region-heading">
                <h2>{region}</h2>
                <span>{String(regionAirports.length).padStart(2, "0")}</span>
              </div>
              <div className="airport-grid">
                {regionAirports.map((airport) => (
                  <a
                    className={`airport-card ${airport.status === "live" ? "is-live" : "is-preparing"}`}
                    href={`/airports/${airport.code.toLowerCase()}`}
                    key={airport.code}
                  >
                    <div className="airport-card-top">
                      <strong className="airport-code">{airport.code}</strong>
                      <span className="airport-state">
                        {airport.status === "live" ? "운영 중" : "준비 중"}
                      </span>
                    </div>
                    <div className="airport-name">
                      <strong>{airport.name}공항</strong>
                      <span>{airport.englishName} Airport</span>
                    </div>
                    <div className="airport-card-bottom">
                      <span>{airport.modes}</span>
                      <b aria-hidden="true">→</b>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <footer className="directory-footer">
        <span>실시간 공개 운항정보를 바탕으로 제공됩니다.</span>
        <strong>대한민국 국내공항 통합 FIDS</strong>
      </footer>
    </main>
  );
}
