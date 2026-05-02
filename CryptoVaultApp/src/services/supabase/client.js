// src/services/supabase/client.js
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl  = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseKey  = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('⚠️  Missing Supabase env vars. Check your .env file.')
}

// React Native needs AsyncStorage instead of localStorage
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage:            AsyncStorage,
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: false,
  },
})
