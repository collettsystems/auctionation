import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

function AdminApp() {
  const capabilities = [
    "Tenant onboarding",
    "Auction/item management",
    "Admin-initiated bidder invites",
    "Email/SMS notification oversight",
    "Iframe embed configuration",
    "Bid and audit reporting"
  ];

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Auctionation Admin</p>
        <h1>Commercial silent auction operations</h1>
        <p>
          Manage tenants, auction items, bidder invites, embed settings, notifications, and reporting from one
          enterprise-grade dashboard.
        </p>
      </section>
      <section className="grid" aria-label="Admin capabilities">
        {capabilities.map((label) => (
          <article className="card" key={label}>
            <h2>{label}</h2>
            <p>Scaffolded module boundary ready for implementation.</p>
          </article>
        ))}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>
);