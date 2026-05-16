// app/page.tsx
import Dashboard from "./Components/DashBoard";

export const metadata = {
  title: "Live & Recent Cricket Matches | Scory",
  description: "Follow live cricket action, view completed matches, and explore tournaments. Real‑time scores, comprehensive stats, and in‑depth analysis for every match.",
  openGraph: {
    title: "Live Cricket Scores & Tournaments | Scory",
    description: "Stay updated with live cricket scores, match schedules, and tournament standings.",
  },
};

export default function Page() {
  return <Dashboard />;
}