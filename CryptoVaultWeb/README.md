# 🔐 CryptoVault v2 — Production Crypto Wallet

A complete, self-custody, multi-chain crypto wallet built with **React + Supabase + ethers.js**.  
No MetaMask. No WalletConnect. Full BIP39/44 key management in the browser.

---

## ✨ What's New in v2

| Feature | Details |
|---|---|
| **RPC Fallback** | 4–6 fallback RPCs per network, 8s timeout per attempt |
| **Polygon Fixed** | Uses `polygon.llamarpc.com` + Ankr. Mumbai → **Amoy** testnet |
| **Dark/Light Mode** | Full dual-theme system, persisted to localStorage |
| **Sidebar Navigation** | Trust Wallet-style sidebar + mobile bottom nav |
| **Toast Notifications** | Global `useToast()` hook throughout every page |
| **Token Swap** | 0x Protocol API — quote, review, sign, broadcast |
| **Buy Crypto** | MoonPay, Transak, Ramp Network integrations |
| **Watchlist** | CoinGecko live prices, 24h change, explore markets |
| **NFT Gallery** | Alchemy (primary) + Moralis (fallback), detail modal |
| **Preferences Page** | Currency, hide balances, auto-lock, analytics toggles |
| **About Page** | Tech stack, features, resource links |
| **Wallet Address Page** | QR code, one-tap copy, inline network switcher |
| **Price Display** | Live USD prices on Dashboard via CoinGecko |
| **Hide Balances** | Eye toggle on Dashboard respects preferences |
| **Code Quality** | All pages use `useToast`, no Bootstrap containers |

---

## 🗂️ Project Structure

```
cryptovault/
├── index.html
├── vite.config.js          # Code splitting, polyfills
├── package.json            # v2.0.0
├── .env.example            # All env vars documented
├── supabase_schema.sql     # Core tables (run first)
├── supabase_schema_v2.sql  # watchlist + nft_cache (run second)
│
└── src/
    ├── App.jsx             # All 18 routes wired in
    ├── index.css           # Full dark/light design system
    ├── main.jsx
    │
    ├── context/
    │   ├── AppContext.jsx      # Auth, wallets, network, prefs
    │   ├── ThemeContext.jsx    # Dark/light toggle
    │   └── ToastContext.jsx    # Global toast notifications
    │
    ├── pages/              # 18 pages total
    │   ├── LandingPage.jsx
    │   ├── LoginPage.jsx / SignupPage.jsx
    │   ├── CreateWalletPage.jsx / ImportWalletPage.jsx
    │   ├── DashboardPage.jsx   # Balances + USD prices
    │   ├── SendPage.jsx        # Full send flow
    │   ├── ReceivePage.jsx     # QR + network switcher
    │   ├── SwapPage.jsx        # 0x Protocol swap
    │   ├── BuyCryptoPage.jsx   # MoonPay/Transak/Ramp
    │   ├── TokensPage.jsx      # ERC-20 management
    │   ├── WatchlistPage.jsx   # CoinGecko prices
    │   ├── NftPage.jsx         # Alchemy/Moralis NFTs
    │   ├── TransactionsPage.jsx
    │   ├── WalletAddressPage.jsx
    │   ├── SettingsPage.jsx
    │   ├── PreferencesPage.jsx
    │   └── AboutPage.jsx
    │
    ├── components/common/
    │   ├── Sidebar.jsx         # Main nav (desktop)
    │   ├── MobileNav.jsx       # Bottom nav (mobile)
    │   ├── LoadingSpinner.jsx
    │   ├── CopyButton.jsx
    │   └── PageWrapper.jsx
    │
    ├── services/
    │   ├── blockchain/
    │   │   ├── walletService.js   # ethers.js + fallback RPC
    │   │   ├── swapService.js     # 0x Protocol
    │   │   └── nftService.js      # Alchemy + Moralis
    │   ├── supabase/
    │   │   ├── client.js
    │   │   ├── authService.js
    │   │   ├── walletDbService.js
    │   │   └── watchlistService.js
    │   └── priceService.js        # CoinGecko
    │
    └── utils/
        ├── networks.js     # 6 networks, rpcUrls[] arrays
        └── encryption.js   # AES-256 + PBKDF2
```

---

## 🚀 Setup (5 steps)

### 1 — Install

```bash
git clone <repo>
cd cryptovault
npm install
```

### 2 — Supabase: Create project

Go to [supabase.com](https://supabase.com) → New Project → wait ~2 min.

### 3 — Run SQL schemas

In **Supabase → SQL Editor**:
1. Run `supabase_schema.sql` (core tables)
2. Run `supabase_schema_v2.sql` (watchlist + NFT cache)

### 4 — Configure environment

```bash
cp .env.example .env
# Edit .env with your keys
```

**Required:**
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_ENCRYPTION_SECRET=at-least-32-random-chars
```

**Optional (features degrade gracefully without them):**
```env
VITE_ETH_SEPOLIA_RPC=https://sepolia.infura.io/v3/YOUR_KEY   # Swap/send
VITE_ZEROX_API_KEY=your-0x-key                               # Swap
VITE_ALCHEMY_ETH_KEY=your-alchemy-key                        # NFTs
VITE_MORALIS_API_KEY=your-moralis-key                        # NFT fallback
VITE_MOONPAY_API_KEY=pk_test_...                             # Buy crypto
```

### 5 — Run

```bash
npm run dev    # → http://localhost:5173
npm run build  # Production build → dist/
```

---

## 🌐 Networks & RPC Fallback

Each network has 4–6 fallback RPC endpoints. The system tries them in order with an 8-second timeout each:

| Network | Primary RPC | Fallbacks |
|---|---|---|
| Ethereum | Infura (env) | `eth.llamarpc.com`, Ankr, PublicNode |
| ETH Sepolia | Infura (env) | Ankr, PublicNode |
| BSC | `bsc-dataseed1.binance.org` | dataseed2, Ankr, PublicNode |
| BSC Testnet | `data-seed-prebsc-1-s1.binance.org` | s2, s1-s2 |
| **Polygon** | **`polygon.llamarpc.com`** | **Ankr, PublicNode** |
| Polygon Amoy | `rpc.ankr.com/polygon_amoy` | PublicNode |

> Mumbai was **deprecated** by Polygon in early 2024. All testnet references now use **Amoy** (chainId 80002).

---

## 🔐 Security Model

```
User creates wallet
       │
       ▼
generateWallet() → { mnemonic, privateKey, address }
       │
       │  encryptPrivateKey(privateKey, userPassword)
       │  ← PBKDF2 (10,000 iterations, SHA-256)
       │  ← AES-256-CBC, random salt + IV
       ▼
Supabase: wallets.encrypted_private_key = "{"salt":...,"iv":...,"ciphertext":...}"
       │
       │  Raw private key is NEVER stored or transmitted
       │
On Send/Swap:
       │
       ▼
User types password → decryptPrivateKey() → key in RAM only
       │
       ▼
new ethers.Wallet(key, provider).sendTransaction(...)
       │
       ▼
Transaction broadcast → key reference dropped
```

---

## 📦 API Keys Quick Reference

| Service | Get Key | Used For | Free Tier |
|---|---|---|---|
| [Supabase](https://supabase.com) | Project Settings → API | Database + Auth | ✅ 500MB |
| [Infura](https://infura.io) | Dashboard → Create Key | ETH/Sepolia RPC | ✅ 100k req/day |
| [0x Protocol](https://dashboard.0x.org) | Create App | Token Swaps | ✅ 200k req/month |
| [Alchemy](https://alchemy.com) | Create App | NFT API | ✅ 300M units/month |
| [Moralis](https://moralis.io) | Create Project | NFT fallback | ✅ 40k req/day |
| [MoonPay](https://moonpay.com/dashboard) | Sandbox key | Buy crypto | ✅ Test mode |
| [CoinGecko](https://coingecko.com/api) | No key needed | Prices | ✅ Free public API |

---

## 🎨 Theme System

Toggle dark/light mode via the Sidebar button or **Preferences** page.

The theme is stored in `localStorage` under `cv_theme` and applied as `data-theme="dark|light"` on `<html>`. All colors are CSS custom properties in `index.css`.

---

## 🧪 Testnet Faucets

| Network | Faucet |
|---|---|
| Ethereum Sepolia | [sepoliafaucet.com](https://sepoliafaucet.com) |
| BSC Testnet | [testnet.binance.org/faucet-smart](https://testnet.binance.org/faucet-smart) |
| Polygon Amoy | [faucet.polygon.technology](https://faucet.polygon.technology) |

---

## 🚢 Deploy to Production

```bash
npm run build       # Creates dist/
```

Deploy `dist/` to **Vercel**, **Netlify**, **Cloudflare Pages**, or any static host.

Set all environment variables in your hosting provider's dashboard (never commit `.env`).

### Production checklist
- [ ] Change `VITE_ENCRYPTION_SECRET` to a 32+ char random string
- [ ] Enable email confirmation in Supabase Auth
- [ ] Use paid RPC endpoints (Infura/Alchemy) for reliability  
- [ ] Configure Supabase DB backups
- [ ] Add custom domain + HTTPS
- [ ] Review all Supabase RLS policies
