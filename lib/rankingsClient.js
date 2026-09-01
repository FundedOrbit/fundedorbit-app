import { supabase } from "./supabaseClient";

export async function fetchTraderRankings() {
  const { data, error } = await supabase.rpc("get_trader_rankings");
  if (error) throw error;
  return data || [];
}

export async function fetchCompanyRankings() {
  const { data, error } = await supabase.rpc("get_company_rankings");
  if (error) throw error;
  return data || [];
}
