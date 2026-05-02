// src/services/supabase/watchlistService.js
import { supabase } from './client'

export const getWatchlist = async () => {
  const { data, error } = await supabase.from('watchlist').select('*').order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export const addToWatchlist = async ({ coinId, symbol, name, thumb }) => {
  const { data, error } = await supabase.from('watchlist').insert({ coin_id: coinId, symbol, name, thumb }).select().single()
  if (error) throw error
  return data
}

export const removeFromWatchlist = async (coinId) => {
  const { error } = await supabase.from('watchlist').delete().eq('coin_id', coinId)
  if (error) throw error
}
