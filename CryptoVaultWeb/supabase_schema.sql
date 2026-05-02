-- ==========================================================================
-- CryptoVault — Supabase PostgreSQL Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ==========================================================================

-- ─── Enable UUID extension ──────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ==========================================================================
-- TABLE: wallets
-- Stores one encrypted wallet per row.
-- encrypted_private_key: AES-256 blob — raw key is NEVER stored plain.
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.wallets (
  id                    UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  address               TEXT NOT NULL,
  encrypted_private_key TEXT NOT NULL,
  network               TEXT NOT NULL DEFAULT 'eth_sepolia',
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Prevent duplicate addresses per user
CREATE UNIQUE INDEX IF NOT EXISTS wallets_user_address_idx
  ON public.wallets (user_id, address);


-- ==========================================================================
-- TABLE: transactions
-- Records every send/receive. Status updated async after block confirmation.
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  tx_hash        TEXT NOT NULL,
  chain          TEXT NOT NULL,
  type           TEXT NOT NULL DEFAULT 'send', -- 'send' | 'receive'
  amount         TEXT,
  to_address     TEXT,
  status         TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'confirmed' | 'failed'
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS transactions_hash_idx ON public.transactions (tx_hash);
CREATE INDEX IF NOT EXISTS transactions_wallet_idx ON public.transactions (wallet_address);


-- ==========================================================================
-- TABLE: tokens
-- Custom ERC-20/BEP-20 tokens per wallet per network.
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.tokens (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address   TEXT NOT NULL,
  contract_address TEXT NOT NULL,
  symbol           TEXT NOT NULL,
  name             TEXT NOT NULL,
  decimals         INT  NOT NULL DEFAULT 18,
  network          TEXT NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Prevent duplicate tokens per wallet per network
CREATE UNIQUE INDEX IF NOT EXISTS tokens_wallet_contract_network_idx
  ON public.tokens (wallet_address, contract_address, network);


-- ==========================================================================
-- TRIGGER: auto-populate user_id from auth.uid()
-- This means the client never needs to pass user_id manually.
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to each table
DROP TRIGGER IF EXISTS set_user_id_on_wallets ON public.wallets;
CREATE TRIGGER set_user_id_on_wallets
  BEFORE INSERT ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

DROP TRIGGER IF EXISTS set_user_id_on_transactions ON public.transactions;
CREATE TRIGGER set_user_id_on_transactions
  BEFORE INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

DROP TRIGGER IF EXISTS set_user_id_on_tokens ON public.tokens;
CREATE TRIGGER set_user_id_on_tokens
  BEFORE INSERT ON public.tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();


-- ==========================================================================
-- ROW LEVEL SECURITY (RLS)
-- Users can ONLY read/write their own rows.
-- ==========================================================================

ALTER TABLE public.wallets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tokens       ENABLE ROW LEVEL SECURITY;

-- ── Wallets ────────────────────────────────────────────────────────────────
CREATE POLICY "wallets: users see own rows" ON public.wallets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "wallets: users insert own rows" ON public.wallets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "wallets: users update own rows" ON public.wallets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "wallets: users delete own rows" ON public.wallets
  FOR DELETE USING (auth.uid() = user_id);

-- ── Transactions ───────────────────────────────────────────────────────────
CREATE POLICY "transactions: users see own rows" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "transactions: users insert own rows" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "transactions: users update own rows" ON public.transactions
  FOR UPDATE USING (auth.uid() = user_id);

-- ── Tokens ─────────────────────────────────────────────────────────────────
CREATE POLICY "tokens: users see own rows" ON public.tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "tokens: users insert own rows" ON public.tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tokens: users delete own rows" ON public.tokens
  FOR DELETE USING (auth.uid() = user_id);


-- ==========================================================================
-- VERIFY: Check everything was created
-- ==========================================================================
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
