// app/match/[id]/analysis/page.tsx
import { Suspense } from "react";
import MatchAnalysisClient from "./MatchAnalysisClient";
import { query } from "@/app/lib/db";

async function getMatchForAnalysis(id: number) {
  const res = await query("SELECT team_a_name, team_b_name FROM matches WHERE id = $1", [id]);
  return res.rows[0];
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const resolved = await params;
  const id = parseInt(resolved.id, 10);
  const match = await getMatchForAnalysis(id);
  if (!match) return { title: "Match Analysis" };
  return {
    title: `${match.team_a_name} vs ${match.team_b_name} – In‑Depth Match Analysis | Scory`,
    description: `Detailed analysis of ${match.team_a_name} vs ${match.team_b_name} including runs per over, partnership charts, run‑rate progression, and player statistics.`,
    openGraph: {
      title: `${match.team_a_name} vs ${match.team_b_name} – Match Analysis`,
      description: "Interactive charts and advanced analytics for this cricket match.",
    },
  };
}

export default function AnalysisPage() {
  return <MatchAnalysisClient />;
}