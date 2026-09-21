import KacAirlineLogoSync from "@/components/fids/KacAirlineLogoSync";
import "./tae.css";
import "./mobile.css";
import "./foldable.css";
import "../fids-common.css";
import "./clock.css";
import "./airline-copy.css";

export default function TaeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <KacAirlineLogoSync />
      {children}
    </>
  );
}
