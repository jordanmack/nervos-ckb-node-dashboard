# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A web-based dashboard for monitoring Nervos CKB L1 full nodes. Designed for 5"-7" Raspberry Pi displays (800x480 to 1280x720 resolution). The app is a completely static React SPA that makes JSON-RPC calls directly to CKB nodes.

## Commands

```sh
bun install        # Install dependencies (prefer Bun over npm)
bun start          # Start dev server on port 3000
bun run build      # Build for production to /build folder
bun test           # Run tests (none currently exist)
```

## Architecture

**Single-component monolith:** The entire application lives in `src/App.tsx` (~640 lines). This is intentional for a simple dashboard but is on the refactoring wishlist.

**Key constants at top of App.tsx:**
- `CKB_RPC_URL_DEFAULT`: Default node endpoint (http://127.0.0.1:8114)
- `REFRESH_DELAY`: 1.7s for regular data updates
- `FULL_REFRESH_DELAY`: 5 minutes for halving target recalculation
- `TICK_DELAY`: 500ms for countdown display updates

**Data flow:**
1. `updateData()` makes batch RPC requests to CKB node (up to 5 concurrent calls)
2. Three `useInterval` hooks handle different refresh rates
3. `txHistory` state maintains rolling 100-block history for charts
4. Settings persisted to localStorage under key `"settings"`

**RPC methods used:**
- `get_tip_header()` - Current block/epoch info
- `get_blockchain_info()` - Chain type (mainnet/testnet)
- `tx_pool_info()` - Transaction pool stats
- `local_node_info()` - Connections/version (disabled for public nodes)
- `get_block_by_number()` - Block details for charts

**Public node mode:** Toggle in settings skips `local_node_info()` call since public nodes don't expose it.

## Styling

- Tailwind CSS for utility classes
- CSS variables (`--app-height`, `--app-width`) calculated in JS for responsive scaling
- **Avoid Tailwind bracket specifiers** (e.g., `w-[100px]`) - they can cause build errors

## Browser Notes

- Firefox recommended
- Chromium browsers require disabling `about://flags#block-insecure-private-network-requests` for local node access
- Linux may need `fonts-noto-color-emoji` package for emoji display
