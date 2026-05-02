// src/services/supabase/authService.js
import { supabase } from './client'

export const signUp  = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  return data
}

export const signIn  = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export const getUser    = async () => (await supabase.auth.getUser()).data.user
export const getSession = async () => (await supabase.auth.getSession()).data.session

export const onAuthStateChange = (cb) =>
  supabase.auth.onAuthStateChange((event, session) => cb(event, session))
