import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ─────────────────────────────────────────────────────────────────────────────
// WHY PROXIES?
// Browser CORS policy blocks direct fetch/XHR to most public APIs from localhost.
// Vite's dev proxy re-issues requests server-side (no CORS restrictions).
// In production, calls go directly from the browser where providers send CORS headers.
// ─────────────────────────────────────────────────────────────────────────────

export default defineConfig({
  plugins: [react()],

  define: {
    global: 'globalThis',
    'process.env': {},
  },

  optimizeDeps: {
    include: ['ethers', 'crypto-js'],
  },

  server: {
    proxy: {
      // ── CoinGecko ──────────────────────────────────────────────────────
      '/api/coingecko': {
        target:       'https://api.coingecko.com',
        changeOrigin: true,
        rewrite:      (p) => p.replace(/^\/api\/coingecko/, '/api/v3'),
      },

      // ── 0x Protocol swap API ───────────────────────────────────────────
      // FIX: removed trailing slash from regex so /api/0x/swap/... is correctly rewritten
      '/api/0x': {
        target:       'https://api.0x.org',
        changeOrigin: true,
        rewrite:      (p) => p.replace(/^\/api\/0x/, ''),
      },
      '/api/0x-sepolia': {
        target:       'https://sepolia.api.0x.org',
        changeOrigin: true,
        rewrite:      (p) => p.replace(/^\/api\/0x-sepolia/, ''),
      },
      '/api/0x-polygon': {
        target:       'https://polygon.api.0x.org',
        changeOrigin: true,
        rewrite:      (p) => p.replace(/^\/api\/0x-polygon/, ''),
      },
      '/api/0x-bsc': {
        target:       'https://bsc.api.0x.org',
        changeOrigin: true,
        rewrite:      (p) => p.replace(/^\/api\/0x-bsc/, ''),
      },

      // ── Ethereum RPC nodes ─────────────────────────────────────────────
      '/rpc/eth-mainnet': {
        target:       'https://eth.llamarpc.com',
        changeOrigin: true,
        rewrite:      (p) => p.replace(/^\/rpc\/eth-mainnet/, ''),
      },
      '/rpc/eth-sepolia': {
        target:       'https://rpc.ankr.com',
        changeOrigin: true,
        rewrite:      (p) => p.replace(/^\/rpc\/eth-sepolia/, '/eth_sepolia'),
      },

      // ── BSC RPC nodes ──────────────────────────────────────────────────
      '/rpc/bsc-mainnet': {
        target:       'https://rpc.ankr.com',
        changeOrigin: true,
        rewrite:      (p) => p.replace(/^\/rpc\/bsc-mainnet/, '/bsc'),
      },
      '/rpc/bsc-testnet': {
        target:       'https://rpc.ankr.com',
        changeOrigin: true,
        rewrite:      (p) => p.replace(/^\/rpc\/bsc-testnet/, '/bsc_testnet'),
      },

      // ── Polygon RPC nodes ──────────────────────────────────────────────
      '/rpc/polygon-mainnet': {
        target:       'https://rpc.ankr.com',
        changeOrigin: true,
        rewrite:      (p) => p.replace(/^\/rpc\/polygon-mainnet/, '/polygon'),
      },
      '/rpc/polygon-amoy': {
        target:       'https://rpc.ankr.com',
        changeOrigin: true,
        rewrite:      (p) => p.replace(/^\/rpc\/polygon-amoy/, '/polygon_amoy'),
      },
    },
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          ethers:   ['ethers'],
          supabase: ['@supabase/supabase-js'],
          react:    ['react', 'react-dom', 'react-router-dom'],
          crypto:   ['crypto-js'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})