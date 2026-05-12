export interface Tournament {
  id: number;
  name: string;
  venue?: string;
  start_date?: string;
  end_date?: string;
  logo_url?: string;
  description?: string;
  status: string;
  created_at: string;
}

export interface Match {
  id: number;
  tournament_id: number;
  team_a_name: string;
  team_a_logo_url?: string;
  team_b_name: string;
  team_b_logo_url?: string;
  venue?: string;
  match_date?: string;
  status: string;
}