-- ==========================================================================
-- CryptoVault v2 — Supplemental Schema (run AFTER supabase_schema.sql)
-- Adds: watchlist table, NFT cache, and new columns
-- ==========================================================================

-- ==========================================================================
-- TABLE: watchlist
-- Stores user's token watchlist (prices fetched live from CoinGecko)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.watchlist (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coin_id    TEXT NOT NULL,             -- CoinGecko coin ID e.g. "bitcoin"
  symbol     TEXT NOT NULL,             -- e.g. "BTC"
  name       TEXT NOT NULL,             -- e.g. "Bitcoin"
  thumb      TEXT,                      -- small image URL from CoinGecko
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS watchlist_user_coin_idx
  ON public.watchlist (user_id, coin_id);

-- ==========================================================================
-- TABLE: nft_cache
-- Optional: cache fetched NFT metadata to reduce API calls
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.nft_cache (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address   TEXT NOT NULL,
  network          TEXT NOT NULL,
  contract_address TEXT NOT NULL,
  token_id         TEXT NOT NULL,
  name             TEXT,
  collection       TEXT,
  image_url        TEXT,
  metadata         JSONB,
  fetched_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS nft_cache_unique_idx
  ON public.nft_cache (wallet_address, network, contract_address, token_id);

-- ==========================================================================
-- TRIGGER: auto-populate user_id for new tables
-- ==========================================================================
DROP TRIGGER IF EXISTS set_user_id_on_watchlist ON public.watchlist;
CREATE TRIGGER set_user_id_on_watchlist
  BEFORE INSERT ON public.watchlist
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

DROP TRIGGER IF EXISTS set_user_id_on_nft_cache ON public.nft_cache;
CREATE TRIGGER set_user_id_on_nft_cache
  BEFORE INSERT ON public.nft_cache
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

-- ==========================================================================
-- ROW LEVEL SECURITY
-- ==========================================================================
ALTER TABLE public.watchlist  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nft_cache  ENABLE ROW LEVEL SECURITY;

-- Watchlist policies
CREATE POLICY "watchlist: users see own rows" ON public.watchlist
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "watchlist: users insert own rows" ON public.watchlist
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "watchlist: users delete own rows" ON public.watchlist
  FOR DELETE USING (auth.uid() = user_id);

-- NFT cache policies
CREATE POLICY "nft_cache: users see own rows" ON public.nft_cache
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "nft_cache: users insert own rows" ON public.nft_cache
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "nft_cache: users update own rows" ON public.nft_cache
  FOR UPDATE USING (auth.uid() = user_id);

-- ==========================================================================
-- VERIFY
-- ==========================================================================
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
