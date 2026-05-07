import type {
  AdminCreateInviteResult,
  AdminPlatformOverview,
  AdminPlatformTenantSummary,
  AdminTenantOverview,
  ApiEnvelope,
  UserRole
} from "@auctionation/shared";
import { StrictMode, useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type LoadState<T> = { status: "loading" } | { status: "loaded"; data: T } | { status: "error"; message: string };
type Notice = { kind: "success" | "error"; message: string } | undefined;

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";
const defaultTenantSlug = import.meta.env.VITE_DEMO_TENANT_SLUG ?? "demo-charity";
const envAdminApiKey = import.meta.env.VITE_ADMIN_API_KEY ?? "";
const currencyFormatter = new Intl.NumberFormat("en-US", { currency: "USD", style: "currency" });
const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

function formatMoney(cents?: number): string { return cents === undefined ? "—" : currencyFormatter.format(cents / 100); }
function formatDate(value: string): string { return dateFormatter.format(new Date(value)); }
function toLocalDateTimeInput(date: Date): string { return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
function centsFromDollars(value: string): number { return Math.round(Number.parseFloat(value || "0") * 100); }
function splitLines(value: string): string[] { return value.split(/\r?\n|,/).map((entry) => entry.trim()).filter(Boolean); }

async function requestAdminData<T>(path: string, adminApiKey: string, init?: RequestInit): Promise<T> {
  const requestUrl = `${apiBaseUrl}${path}`;
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.body) headers.set("Content-Type", "application/json");
  if (adminApiKey) headers.set("Authorization", `Bearer ${adminApiKey}`);
  const response = await fetch(requestUrl, { ...init, headers });
  const body = await response.json().catch(() => undefined) as ApiEnvelope<T> | { data?: { message?: string; code?: string }; message?: string; code?: string } | undefined;
  if (!response.ok) {
    const detail = body && "data" in body && body.data && "message" in body.data ? body.data.message : body?.message ?? body?.code ?? "Admin API request failed";
    throw new Error(`${response.status} ${detail}`);
  }
  return (body as ApiEnvelope<T>).data;
}

function useAdminData(adminApiKey: string, tenantSlug: string) {
  const [platform, setPlatform] = useState<LoadState<AdminPlatformOverview>>({ status: "loading" });
  const [tenant, setTenant] = useState<LoadState<AdminTenantOverview>>({ status: "loading" });
  const load = useCallback(() => {
    let active = true;
    setPlatform({ status: "loading" }); setTenant({ status: "loading" });
    Promise.all([
      requestAdminData<AdminPlatformOverview>("/admin/platform/overview", adminApiKey),
      requestAdminData<AdminTenantOverview>(`/admin/tenant/overview?tenantSlug=${encodeURIComponent(tenantSlug)}`, adminApiKey)
    ]).then(([platformData, tenantData]) => {
      if (!active) return;
      setPlatform({ status: "loaded", data: platformData }); setTenant({ status: "loaded", data: tenantData });
    }).catch((error: unknown) => {
      if (!active) return;
      const message = error instanceof Error ? error.message : "Unknown admin API error";
      setPlatform({ status: "error", message }); setTenant({ status: "error", message });
    });
    return () => { active = false; };
  }, [adminApiKey, tenantSlug]);
  useEffect(() => load(), [load]);
  return { platform, tenant, reload: load };
}

function StatusBadge({ label }: { label: string }) { return <span className={`status status-${label.toLowerCase()}`}>{label}</span>; }
function MetricGrid({ metrics }: { metrics: { label: string; value: number; detail?: string }[] }) { return <div className="metric-grid">{metrics.map((metric) => <article className="metric-card" key={metric.label}><span>{metric.label}</span><strong>{metric.value.toLocaleString()}</strong>{metric.detail ? <small>{metric.detail}</small> : null}</article>)}</div>; }
function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) { return <section className="panel"><div className="section-heading"><p className="eyebrow dark">{eyebrow}</p><h2>{title}</h2></div>{children}</section>; }
function NoticeView({ notice }: { notice: Notice }) { return notice ? <p className={`notice ${notice.kind}`}>{notice.message}</p> : null; }

type MutationFormProps = { adminApiKey: string; reload: () => void; tenants: AdminPlatformTenantSummary[]; activeTenant?: AdminPlatformTenantSummary; auctions?: AdminTenantOverview["auctions"] };

function ProvisioningForms({ adminApiKey, reload, tenants, activeTenant, auctions = [] }: MutationFormProps) {
  const [notice, setNotice] = useState<Notice>();
  const [tenantId, setTenantId] = useState(activeTenant?.id ?? tenants[0]?.id ?? "");
  const [auctionId, setAuctionId] = useState(auctions[0]?.id ?? "");
  useEffect(() => { if (activeTenant?.id) setTenantId(activeTenant.id); }, [activeTenant?.id]);
  useEffect(() => { if (auctions[0]?.id) setAuctionId(auctions[0].id); }, [auctions]);

  async function mutate<T>(path: string, payload: unknown, success: (data: T) => string) {
    try {
      const data = await requestAdminData<T>(path, adminApiKey, { method: "POST", body: JSON.stringify(payload) });
      setNotice({ kind: "success", message: success(data) }); reload();
    } catch (error) { setNotice({ kind: "error", message: error instanceof Error ? error.message : "Provisioning failed" }); }
  }

  return <div className="dashboard-stack"><NoticeView notice={notice} />
    <div className="form-grid">
      <form className="provision-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void mutate<AdminPlatformTenantSummary>("/admin/platform/tenants", { slug: form.get("slug"), name: form.get("name"), status: form.get("status"), allowedEmbedOrigins: splitLines(String(form.get("origins") ?? "")) }, (tenant) => `Created tenant ${tenant.name}.`); event.currentTarget.reset(); }}>
        <h3>Create tenant</h3><label>Slug<input name="slug" placeholder="client-charity" required /></label><label>Name<input name="name" placeholder="Client Charity" required /></label><label>Status<select name="status"><option>active</option><option>suspended</option><option>archived</option></select></label><label>Allowed embed origins<textarea name="origins" placeholder="https://client.example" /></label><button>Create tenant</button>
      </form>
      <form className="provision-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void mutate("/admin/platform/tenants/" + form.get("tenantId") + "/admin-users", { displayName: form.get("displayName"), email: form.get("email"), phoneNumber: form.get("phoneNumber"), roles: [form.get("role") as UserRole] }, () => "Created admin/manager user."); event.currentTarget.reset(); }}>
        <h3>Create admin user</h3><label>Tenant<select name="tenantId" value={tenantId} onChange={(e) => setTenantId(e.target.value)}>{tenants.map((tenant) => <option value={tenant.id} key={tenant.id}>{tenant.name}</option>)}</select></label><label>Display name<input name="displayName" required /></label><label>Email<input name="email" type="email" /></label><label>Phone<input name="phoneNumber" /></label><label>Role<select name="role"><option value="tenant_admin">Tenant admin</option><option value="auction_manager">Auction manager</option></select></label><button>Create user</button>
      </form>
      {activeTenant ? <>
        <form className="provision-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void mutate(`/admin/tenants/${activeTenant.id}/auctions`, { slug: form.get("slug"), title: form.get("title"), description: form.get("description"), status: form.get("status"), startsAt: new Date(String(form.get("startsAt"))).toISOString(), endsAt: new Date(String(form.get("endsAt"))).toISOString(), currency: form.get("currency"), timezone: form.get("timezone") }, () => "Created auction."); event.currentTarget.reset(); }}>
          <h3>Create auction</h3><label>Slug<input name="slug" required /></label><label>Title<input name="title" required /></label><label>Description<textarea name="description" /></label><label>Status<select name="status"><option>draft</option><option>scheduled</option><option>open</option><option>closed</option></select></label><label>Starts<input name="startsAt" type="datetime-local" defaultValue={toLocalDateTimeInput(new Date(Date.now() + 3600000))} required /></label><label>Ends<input name="endsAt" type="datetime-local" defaultValue={toLocalDateTimeInput(new Date(Date.now() + 86400000))} required /></label><label>Currency<input name="currency" defaultValue="USD" maxLength={3} /></label><label>Timezone<input name="timezone" defaultValue="America/Chicago" /></label><button>Create auction</button>
        </form>
        <form className="provision-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void mutate(`/admin/tenants/${activeTenant.id}/auctions/${form.get("auctionId")}/items`, { lotNumber: form.get("lotNumber"), title: form.get("title"), description: form.get("description"), imageUrls: splitLines(String(form.get("imageUrls") ?? "")), startingBidCents: centsFromDollars(String(form.get("startingBid") ?? "0")), minimumBidIncrementCents: centsFromDollars(String(form.get("increment") ?? "1")), fairMarketValueCents: form.get("fmv") ? centsFromDollars(String(form.get("fmv"))) : undefined }, () => "Added auction item."); event.currentTarget.reset(); }}>
          <h3>Add item/lot</h3><label>Auction<select name="auctionId" value={auctionId} onChange={(e) => setAuctionId(e.target.value)}>{auctions.map((auction) => <option value={auction.id} key={auction.id}>{auction.title}</option>)}</select></label><label>Lot #<input name="lotNumber" /></label><label>Title<input name="title" required /></label><label>Description<textarea name="description" required /></label><label>Image URLs<textarea name="imageUrls" /></label><label>Starting bid ($)<input name="startingBid" type="number" step="0.01" defaultValue="0" required /></label><label>Increment ($)<input name="increment" type="number" step="0.01" defaultValue="5" required /></label><label>FMV ($)<input name="fmv" type="number" step="0.01" /></label><button>Add item</button>
        </form>
        <form className="provision-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void mutate<AdminCreateInviteResult>(`/admin/tenants/${activeTenant.id}/invites`, { auctionId: form.get("auctionId") || undefined, email: form.get("email"), phoneNumber: form.get("phoneNumber") }, (data) => `Created invite: ${data.inviteUrl}`); event.currentTarget.reset(); }}>
          <h3>Create invite</h3><label>Auction<select name="auctionId"><option value="">Tenant-wide</option>{auctions.map((auction) => <option value={auction.id} key={auction.id}>{auction.title}</option>)}</select></label><label>Email<input name="email" type="email" /></label><label>Phone<input name="phoneNumber" /></label><button>Create invite</button>
        </form>
      </> : null}
    </div>
  </div>;
}

function PlatformDashboard({ overview }: { overview: AdminPlatformOverview }) { return <div className="dashboard-stack"><MetricGrid metrics={overview.metrics} /><div className="two-column"><Section eyebrow="Platform" title="Tenant onboarding"><div className="list">{overview.tenants.map((tenant) => <article className="list-row" key={tenant.id}><div><strong>{tenant.name}</strong><span>{tenant.slug}</span></div><div className="row-meta"><StatusBadge label={tenant.status} /><span>{tenant.auctionCount} auctions</span></div></article>)}</div></Section><Section eyebrow="Platform" title="Cross-tenant auction health"><div className="list">{overview.auctions.map((auction) => <article className="list-row" key={auction.id}><div><strong>{auction.title}</strong><span>{auction.tenantName} · {auction.itemCount} items · {auction.bidCount} bids</span></div><div className="row-meta"><StatusBadge label={auction.status} /><span>{formatMoney(auction.highBidCents)}</span></div></article>)}</div></Section></div><Section eyebrow="Platform" title="Bid and audit reporting"><div className="table-wrap"><table><thead><tr><th>Tenant</th><th>Auction</th><th>Item</th><th>Bidder</th><th>Amount</th><th>When</th></tr></thead><tbody>{overview.recentBids.map((bid) => <tr key={bid.id}><td>{bid.tenantSlug}</td><td>{bid.auctionTitle}</td><td>{bid.itemTitle}</td><td>{bid.bidderDisplayName}</td><td>{formatMoney(bid.amountCents)}</td><td>{formatDate(bid.createdAt)}</td></tr>)}</tbody></table></div></Section></div>; }

function TenantDashboard({ overview }: { overview: AdminTenantOverview }) {
  const notificationCopy = overview.notificationPersistenceEnabled ? "Email/SMS delivery records are persisted for this tenant." : "Notification package exists; persistence table is pending.";
  const workspaceCapabilities = useMemo(() => [{ title: "Auction/item management", detail: `${overview.auctions.length} auctions and ${overview.items.length} visible lots in this tenant workspace.` }, { title: "Admin-initiated bidder invites", detail: `${overview.invites.length} invite records loaded from tenant scope.` }, { title: "Email/SMS notification oversight", detail: notificationCopy }, { title: "Iframe embed configuration", detail: `${overview.tenant.allowedEmbedOrigins.length} allowed origins configured.` }], [notificationCopy, overview.auctions.length, overview.invites.length, overview.items.length, overview.tenant.allowedEmbedOrigins.length]);
  return <div className="dashboard-stack"><div className="tenant-banner"><div><p className="eyebrow dark">Tenant workspace</p><h2>{overview.tenant.name}</h2><span>{overview.tenant.slug}</span></div><StatusBadge label={overview.tenant.status} /></div><MetricGrid metrics={overview.metrics.filter((metric) => metric.label !== "Tenants")} /><div className="capability-grid">{workspaceCapabilities.map((capability) => <article className="capability-card" key={capability.title}><h3>{capability.title}</h3><p>{capability.detail}</p></article>)}</div><div className="two-column"><Section eyebrow="Tenant" title="Auction items"><div className="list compact">{overview.items.map((item) => <article className="list-row" key={item.id}><div><strong>{item.lotNumber ? `Lot ${item.lotNumber}: ` : ""}{item.title}</strong><span>Start {formatMoney(item.startingBidCents)} · Increment {formatMoney(item.minimumBidIncrementCents)}</span></div><div className="row-meta"><span>{item.bidCount} bids</span><strong>{formatMoney(item.currentBidCents)}</strong></div></article>)}</div></Section><Section eyebrow="Tenant" title="Bidder invites">{overview.invites.length === 0 ? <p className="empty-state">No invites yet. Use provisioning to create bidder entry points.</p> : <div className="list compact">{overview.invites.map((invite) => <article className="list-row" key={invite.id}><div><strong>{invite.email ?? invite.phoneNumber ?? "Invite recipient pending"}</strong><span>{invite.auctionTitle ?? "Tenant-wide invite"}</span></div><div className="row-meta"><StatusBadge label={invite.status} /><span>Expires {formatDate(invite.expiresAt)}</span></div></article>)}</div>}</Section></div><Section eyebrow="Tenant" title="Embed configuration"><div className="embed-grid"><div><h3>Allowed origins</h3>{overview.tenant.allowedEmbedOrigins.length === 0 ? <p className="empty-state">No embed origins configured.</p> : <ul className="pill-list">{overview.tenant.allowedEmbedOrigins.map((origin) => <li key={origin}>{origin}</li>)}</ul>}</div><div><h3>Preview paths</h3>{overview.embedPreviewUrls.length === 0 ? <p className="empty-state">Create an auction to generate an embed path.</p> : <ul className="code-list">{overview.embedPreviewUrls.map((url) => <li key={url}><code>{url}</code></li>)}</ul>}</div></div></Section></div>;
}

function LoadBoundary<T>({ state, children }: { state: LoadState<T>; children: (data: T) => React.ReactNode }) { if (state.status === "loading") return <div className="panel loading">Loading admin operations data…</div>; if (state.status === "error") return <div className="panel error">Admin API unavailable: {state.message}</div>; return children(state.data); }

function AdminApp() {
  const [adminApiKey, setAdminApiKey] = useState(() => localStorage.getItem("auctionation-admin-api-key") ?? envAdminApiKey);
  const [tenantSlug, setTenantSlug] = useState(defaultTenantSlug);
  const { platform, tenant, reload } = useAdminData(adminApiKey, tenantSlug);
  const tenants = platform.status === "loaded" ? platform.data.tenants : [];
  return <main className="shell"><section className="hero"><p className="eyebrow">Auctionation Admin</p><h1>Commercial silent auction operations</h1><p>Provision tenants, admins, auctions, lots, and bidder invites from one operational dashboard.</p><div className="hero-note">Production protection uses an interim admin API key. Replace this with full login/session/RBAC before broad operator rollout.</div></section>
    <section className="panel admin-controls"><label>Admin API key<input type="password" value={adminApiKey} onChange={(event) => { setAdminApiKey(event.target.value); localStorage.setItem("auctionation-admin-api-key", event.target.value); }} placeholder="Required when API protection is enabled" /></label><label>Tenant workspace slug<input value={tenantSlug} onChange={(event) => setTenantSlug(event.target.value)} /></label><button onClick={reload}>Reload dashboards</button></section>
    <div className="scope-grid"><article><span>Platform operator</span><strong>Cross-tenant control plane</strong><p>Onboard tenants, monitor auction health, and audit bid activity across Auctionation.</p></article><article><span>Tenant admin</span><strong>Scoped auction workspace</strong><p>Manage a tenant’s auctions, lots, invites, embed settings, and reporting.</p></article></div>
    <LoadBoundary state={platform}>{(overview) => <><ProvisioningForms adminApiKey={adminApiKey} reload={reload} tenants={overview.tenants} activeTenant={tenant.status === "loaded" ? tenant.data.tenant : undefined} auctions={tenant.status === "loaded" ? tenant.data.auctions : []} /><PlatformDashboard overview={overview} /></>}</LoadBoundary>
    <LoadBoundary state={tenant}>{(overview) => <TenantDashboard overview={overview} />}</LoadBoundary>
  </main>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><AdminApp /></StrictMode>);
