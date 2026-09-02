import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "대한민국 국내공항 통합 FIDS",
    short_name: "공항 FIDS",
    description: "국내공항 통합 실시간 운항정보 전광판",
    start_url: "/",
    display: "standalone",
    background_color: "#07111f",
    theme_color: "#07111f",
    lang: "ko",
    icons: [
      { src: "/icons/fids.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/fids-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
