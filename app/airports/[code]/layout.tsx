import AirlineLogoSync from "@/components/fids/AirlineLogoSync";
import "../tae/tae.css";
import "../tae/mobile.css";
import "../tae/foldable.css";
import "../fids-common.css";
import "../tae/clock.css";
import "../tae/airline-copy.css";
import "../airline-logo.css";

export default function KacAirportLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AirlineLogoSync />
      {children}
    </>
  );
}
