import type { PublicAuctionItemSummary, PublicAuctionSummary } from "@auctionation/shared";
import { AUCTIONATION_EMBED_RESIZE_EVENT } from "@auctionation/shared";
import { StrictMode, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const fallbackAuction: PublicAuctionSummary = {
  tenantSlug: "demo-charity",
  auctionSlug: "spring-gala",
  title: "Spring Gala Silent Auction",
  description: "A secure iframe-first auction experience that can be embedded into client websites.",
  status: "open",
  startsAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  endsAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
  currency: "USD"
};

const fallbackItems: PublicAuctionItemSummary[] = [
  {
    id: "item_demo_101",
    lotNumber: "101",
    title: "Private Chef Dinner",
    description: "An in-home dinner experience for six guests.",
    imageUrls: [],
    currentBidCents: 45000,
    minimumBidIncrementCents: 2500
  },
  {
    id: "item_demo_102",
    lotNumber: "102",
    title: "Courtside Tickets",
    description: "Two premium seats for a regular-season game.",
    imageUrls: [],
    currentBidCents: 92500,
    minimumBidIncrementCents: 5000
  }
];

function formatMoney(cents: number | undefined, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format((cents ?? 0) / 100);
}

function useEmbedParams() {
  return useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      tenant: params.get("tenant") ?? fallbackAuction.tenantSlug,
      auction: params.get("auction") ?? fallbackAuction.auctionSlug
    };
  }, []);
}

function EmbedApp() {
  const params = useEmbedParams();
  const auction = { ...fallbackAuction, tenantSlug: params.tenant, auctionSlug: params.auction };

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      window.parent.postMessage(
        {
          type: AUCTIONATION_EMBED_RESIZE_EVENT,
          height: document.documentElement.scrollHeight
        },
        "*"
      );
    });
    resizeObserver.observe(document.body);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <main className="embed-shell">
      <header className="embed-header">
        <p className="tenant">{auction.tenantSlug}</p>
        <h1>{auction.title}</h1>
        <p>{auction.description}</p>
        <strong>Status: {auction.status}</strong>
      </header>
      <section className="items" aria-label="Auction items">
        {fallbackItems.map((item) => (
          <article className="item-card" key={item.id}>
            <span className="lot">Lot {item.lotNumber}</span>
            <h2>{item.title}</h2>
            <p>{item.description}</p>
            <div className="bid-row">
              <span>Current bid</span>
              <strong>{formatMoney(item.currentBidCents, auction.currency)}</strong>
            </div>
            <button type="button">Sign in to bid</button>
          </article>
        ))}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <EmbedApp />
  </StrictMode>
);