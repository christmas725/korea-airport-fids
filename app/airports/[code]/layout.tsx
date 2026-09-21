import KacAirlineLogoSync from "@/components/fids/KacAirlineLogoSync";
import "../tae/tae.css";
import "../tae/mobile.css";
import "../tae/foldable.css";
import "../fids-common.css";
import "../tae/clock.css";
import "../tae/airline-copy.css";

export default function KacAirportLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <KacAirlineLogoSync />
      {children}
    </>
  );
}
