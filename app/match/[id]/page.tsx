import { notFound } from "next/navigation";
import MatchDetailClient from "./MatchDetailClient";
import { query } from "@/app/lib/db";

interface Props {
  params: { id: string };
}

async function getMatchData(id: number) {
  const result = await query(`SELECT * FROM matches WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

export async function generateMetadata({ params }: Props) {
  const id = parseInt(params.id);
  // ✅ Guard against NaN
  if (isNaN(id)) notFound();

  const match = await getMatchData(id);
  if (!match) notFound();

  return {
    title: `${match.team_a_name} vs ${match.team_b_name}`,
    description: `Live score of ${match.team_a_name} vs ${match.team_b_name}`,
  };
}

export default async function Page({ params }: Props) {
  const id = parseInt(params.id);
  // ✅ Guard against NaN
  if (isNaN(id)) notFound();

  const match = await getMatchData(id);
  if (!match) notFound();

  return <MatchDetailClient matchi={match} matchId={id} />;
}