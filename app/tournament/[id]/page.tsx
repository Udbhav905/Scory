import { Suspense } from "react";
import TournamentDetailClient from "./TournamentDetailClient";

interface Props {
  params: Promise<{ id: string }> | { id: string };
}

export default async function TournamentPage({ params }: Props) {
  const resolvedParams = await params;
  const tournamentId = parseInt(resolvedParams.id, 10);

  // Validate the ID
  if (isNaN(tournamentId)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        Invalid tournament ID: {resolvedParams.id}
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">Loading tournament...</div>}>
      <TournamentDetailClient tournamentId={tournamentId} />
    </Suspense>
  );
}