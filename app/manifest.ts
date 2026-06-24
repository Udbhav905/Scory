import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Scory – Live Cricket Scores & Analytics",
    short_name: "Scory",
    description: "Real‑time cricket scores, ball‑by‑ball commentary, detailed match analysis, and tournament tracking.",
    start_url: "/",
    display: "standalone",
    background_color: "#0d1b2a",
    theme_color: "#0d1b2a",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
