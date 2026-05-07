# Embedding Guide

Auctionation uses an iframe-first embed strategy for commercial reliability and isolation from third-party CSS/JavaScript.

## Recommended embed snippet

```html
<div id="auctionation-auction"></div>
<script
  src="https://cdn.example.com/auctionation-embed.js"
  data-container="auctionation-auction"
  data-embed-origin="https://auctions.example.com/embed"
  data-tenant="client-slug"
  data-auction="auction-slug">
</script>
```

## Why iframe first

- Prevents client-site CSS collisions.
- Simplifies authentication and session boundaries.
- Provides a stable commercial support surface.
- Allows tenant-level allowed-origin checks.

## Security requirements

- Each tenant should configure allowed embed origins.
- The embed API must expose public/bidder-safe data only.
- Parent-window messages must validate `event.origin`.
- Future authenticated bidding should use secure cookies or short-lived tokens.

## Local demo

Run both apps:

```bash
npm run dev:embed
npm run dev:widget-demo
```

Open the widget demo on `http://127.0.0.1:5175`.