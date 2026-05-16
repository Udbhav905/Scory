import MatchDetailClient from "./MatchDetailClient";
import { query } from "@/app/lib/db";

interface Props {
  params: { id: string };
}

// ✅ Fetch data
async function getMatchData(id: number) {
  const result = await query(
    `SELECT * FROM matches WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

// ✅ SEO here
export async function generateMetadata({ params }: Props) {
  const id = parseInt(params.id);
  const match = await getMatchData(id);

  if (!match) {
    return {
      title: "Match Not Found",
    };
  }

  return {
    title: `${match.team_a_name} vs ${match.team_b_name}`,
    description: `Live score of ${match.team_a_name} vs ${match.team_b_name}`,
  };
}

// ✅ Server render
export default async function Page({ params }: Props) {
  const id = parseInt(params.id);
  const match = await getMatchData(id);

  return <MatchDetailClient matchi={match} matchId={id} />;
}