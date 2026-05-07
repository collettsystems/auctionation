import type {
  AdminAuctionItemSummary,
  AdminAuctionSummary,
  AdminBidSummary,
  AdminCreateAuctionItemRequest,
  AdminCreateAuctionRequest,
  AdminCreateInviteRequest,
  AdminCreateInviteResult,
  AdminCreateTenantRequest,
  AdminCreateUserRequest,
  AdminInviteSummary,
  AdminMetric,
  AdminPlatformOverview,
  AdminPlatformTenantSummary,
  AdminTenantOverview,
  AdminUpdateAuctionItemRequest,
  AdminUpdateAuctionRequest,
  AdminUpdateTenantRequest,
  AdminUserSummary,
  ApiEnvelope,
  AuctionStatus,
  TenantStatus,
  UserRole
} from "@auctionation/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

interface CountRow { count: string; }
interface TenantRow {
  id: string; slug: string; name: string; status: AdminPlatformTenantSummary["status"]; allowed_embed_origins: string[];
  auction_count: string; item_count: string; invite_count: string; bid_count: string; created_at: Date; updated_at: Date;
}
interface AuctionRow {
  id: string; tenant_id: string; tenant_slug: string; tenant_name: string; slug: string; title: string;
  status: AdminAuctionSummary["status"]; starts_at: Date; ends_at: Date; currency: string; timezone: string;
  item_count: string; bid_count: string; high_bid_cents: number | null;
}
interface ItemRow {
  id: string; auction_id: string; lot_number: string | null; title: string; starting_bid_cents: number;
  minimum_bid_increment_cents: number; fair_market_value_cents: number | null; current_bid_cents: number | null; bid_count: string;
}
interface InviteRow {
  id: string; tenant_id: string; tenant_slug: string; auction_id: string | null; auction_title: string | null; email: string | null;
  phone_number: string | null; status: AdminInviteSummary["status"]; expires_at: Date; accepted_at: Date | null; created_at: Date;
}
interface BidRow {
  id: string; tenant_id: string; tenant_slug: string; auction_id: string; auction_title: string; item_id: string; item_title: string;
  bidder_user_id: string; bidder_display_name: string; amount_cents: number; status: AdminBidSummary["status"]; created_at: Date;
}
interface UserRow {
  id: string; tenant_id: string; email: string | null; phone_number: string | null; display_name: string; roles: UserRole[]; created_at: Date; updated_at: Date;
}
interface IdRow { id: string; }

const tenantStatuses: TenantStatus[] = ["active", "suspended", "archived"];
const auctionStatuses: AuctionStatus[] = ["draft", "scheduled", "open", "closing", "closed", "settled"];
const userRoles: UserRole[] = ["platform_admin", "tenant_admin", "auction_manager", "bidder"];
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const toCount = (value: string | number): number => Number(value);
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const asString = (value: unknown): string | undefined => typeof value === "string" && value.trim() ? value.trim() : undefined;
const asStringArray = (value: unknown): string[] | undefined => Array.isArray(value) && value.every((entry) => typeof entry === "string") ? value.map((entry) => entry.trim()).filter(Boolean) : undefined;
const asNumber = (value: unknown): number | undefined => typeof value === "number" && Number.isInteger(value) ? value : undefined;
const normalizeSlug = (value: string): string => value.trim().toLowerCase();

class AdminInputError extends Error {
  constructor(message: string, readonly statusCode = 400, readonly code = "INVALID_ADMIN_INPUT") { super(message); }
}

function sendError(reply: FastifyReply, request: FastifyRequest, statusCode: number, code: string, message: string): void {
  reply.code(statusCode).send({ data: { code, message }, requestId: request.id });
}

function requireUuid(value: string, label: string): void {
  if (!uuidPattern.test(value)) throw new AdminInputError(`${label} must be a valid UUID.`);
}
function requireSlug(value: string, label = "slug"): string {
  const slug = normalizeSlug(value);
  if (!slugPattern.test(slug)) throw new AdminInputError(`${label} must contain lowercase letters, numbers, and single hyphens only.`);
  return slug;
}
function requireDate(value: string, label: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new AdminInputError(`${label} must be a valid ISO date/time.`);
  return date;
}
function validateOrigins(origins: string[] | undefined): string[] {
  if (!origins) return [];
  return origins.map((origin) => {
    try {
      const parsed = new URL(origin);
      if (!/^https?:$/.test(parsed.protocol)) throw new Error("bad protocol");
      return parsed.origin;
    } catch { throw new AdminInputError(`Allowed embed origin is invalid: ${origin}`); }
  });
}
function validateCurrency(value: string | undefined): string { return (value ?? "USD").trim().toUpperCase(); }
function validateTimezone(value: string | undefined): string { return value?.trim() || "America/Chicago"; }
function requireCents(value: number | undefined, label: string, allowZero: boolean): number {
  if (value === undefined || value < 0 || (!allowZero && value === 0)) throw new AdminInputError(`${label} must be ${allowZero ? "a non-negative" : "a positive"} integer cent amount.`);
  return value;
}
function getAdminKey(request: FastifyRequest): string | undefined {
  const header = request.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7).trim();
  const apiKeyHeader = request.headers["x-admin-api-key"];
  return Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader;
}
function safeCompare(a: string, b: string): boolean {
  const left = Buffer.from(a); const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
async function requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const expected = request.server.config.adminApiKey;
  if (!request.server.config.adminApiKeyRequired && !expected) return;
  const actual = getAdminKey(request);
  if (!expected || !actual || !safeCompare(actual, expected)) sendError(reply, request, 401, "ADMIN_AUTH_REQUIRED", "A valid admin API key is required.");
}

function mapTenant(row: TenantRow): AdminPlatformTenantSummary { return { id: row.id, slug: row.slug, name: row.name, status: row.status, allowedEmbedOrigins: row.allowed_embed_origins, auctionCount: toCount(row.auction_count), itemCount: toCount(row.item_count), inviteCount: toCount(row.invite_count), bidCount: toCount(row.bid_count), createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString() }; }
function mapAuction(row: AuctionRow): AdminAuctionSummary { return { id: row.id, tenantId: row.tenant_id, tenantSlug: row.tenant_slug, tenantName: row.tenant_name, slug: row.slug, title: row.title, status: row.status, startsAt: row.starts_at.toISOString(), endsAt: row.ends_at.toISOString(), currency: row.currency, timezone: row.timezone, itemCount: toCount(row.item_count), bidCount: toCount(row.bid_count), highBidCents: row.high_bid_cents ?? undefined }; }
function mapItem(row: ItemRow): AdminAuctionItemSummary { return { id: row.id, auctionId: row.auction_id, lotNumber: row.lot_number ?? undefined, title: row.title, startingBidCents: row.starting_bid_cents, minimumBidIncrementCents: row.minimum_bid_increment_cents, fairMarketValueCents: row.fair_market_value_cents ?? undefined, currentBidCents: row.current_bid_cents ?? undefined, bidCount: toCount(row.bid_count) }; }
function mapInvite(row: InviteRow): AdminInviteSummary { return { id: row.id, tenantId: row.tenant_id, tenantSlug: row.tenant_slug, auctionId: row.auction_id ?? undefined, auctionTitle: row.auction_title ?? undefined, email: row.email ?? undefined, phoneNumber: row.phone_number ?? undefined, status: row.status, expiresAt: row.expires_at.toISOString(), acceptedAt: row.accepted_at?.toISOString(), createdAt: row.created_at.toISOString() }; }
function mapBid(row: BidRow): AdminBidSummary { return { id: row.id, tenantId: row.tenant_id, tenantSlug: row.tenant_slug, auctionId: row.auction_id, auctionTitle: row.auction_title, itemId: row.item_id, itemTitle: row.item_title, bidderUserId: row.bidder_user_id, bidderDisplayName: row.bidder_display_name, amountCents: row.amount_cents, status: row.status, createdAt: row.created_at.toISOString() }; }
function mapUser(row: UserRow): AdminUserSummary { return { id: row.id, tenantId: row.tenant_id, email: row.email ?? undefined, phoneNumber: row.phone_number ?? undefined, displayName: row.display_name, roles: row.roles, createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString() }; }

async function getCount(app: FastifyInstance, tableName: "tenants" | "auctions" | "auction_items" | "invites" | "bids"): Promise<number> { const result = await app.db.query<CountRow>(`SELECT COUNT(*) AS count FROM ${tableName}`); return toCount(result.rows[0]?.count ?? 0); }
async function getTenants(app: FastifyInstance, tenantSlug?: string): Promise<AdminPlatformTenantSummary[]> {
  const result = await app.db.query<TenantRow>(`SELECT tenants.id, tenants.slug, tenants.name, tenants.status, tenants.allowed_embed_origins, COUNT(DISTINCT auctions.id) AS auction_count, COUNT(DISTINCT auction_items.id) AS item_count, COUNT(DISTINCT invites.id) AS invite_count, COUNT(DISTINCT bids.id) AS bid_count, tenants.created_at, tenants.updated_at FROM tenants LEFT JOIN auctions ON auctions.tenant_id = tenants.id LEFT JOIN auction_items ON auction_items.tenant_id = tenants.id LEFT JOIN invites ON invites.tenant_id = tenants.id LEFT JOIN bids ON bids.tenant_id = tenants.id WHERE ($1::text IS NULL OR tenants.slug = $1) GROUP BY tenants.id ORDER BY tenants.created_at DESC`, [tenantSlug ?? null]);
  return result.rows.map(mapTenant);
}
async function getAuctions(app: FastifyInstance, tenantSlug?: string): Promise<AdminAuctionSummary[]> {
  const result = await app.db.query<AuctionRow>(`SELECT auctions.id, auctions.tenant_id, tenants.slug AS tenant_slug, tenants.name AS tenant_name, auctions.slug, auctions.title, auctions.status, auctions.starts_at, auctions.ends_at, auctions.currency, auctions.timezone, COUNT(DISTINCT auction_items.id) AS item_count, COUNT(DISTINCT bids.id) AS bid_count, MAX(bids.amount_cents) AS high_bid_cents FROM auctions JOIN tenants ON tenants.id = auctions.tenant_id LEFT JOIN auction_items ON auction_items.auction_id = auctions.id LEFT JOIN bids ON bids.auction_id = auctions.id WHERE ($1::text IS NULL OR tenants.slug = $1) GROUP BY auctions.id, tenants.id ORDER BY auctions.starts_at DESC LIMIT 25`, [tenantSlug ?? null]);
  return result.rows.map(mapAuction);
}
async function getItems(app: FastifyInstance, tenantSlug: string): Promise<AdminAuctionItemSummary[]> {
  const result = await app.db.query<ItemRow>(`SELECT auction_items.id, auction_items.auction_id, auction_items.lot_number, auction_items.title, auction_items.starting_bid_cents, auction_items.minimum_bid_increment_cents, auction_items.fair_market_value_cents, COALESCE(MAX(bids.amount_cents), auction_items.starting_bid_cents) AS current_bid_cents, COUNT(DISTINCT bids.id) AS bid_count FROM auction_items JOIN tenants ON tenants.id = auction_items.tenant_id LEFT JOIN bids ON bids.item_id = auction_items.id WHERE tenants.slug = $1 GROUP BY auction_items.id ORDER BY auction_items.lot_number NULLS LAST, auction_items.created_at DESC LIMIT 50`, [tenantSlug]);
  return result.rows.map(mapItem);
}
async function getInvites(app: FastifyInstance, tenantSlug?: string): Promise<AdminInviteSummary[]> {
  const result = await app.db.query<InviteRow>(`SELECT invites.id, invites.tenant_id, tenants.slug AS tenant_slug, invites.auction_id, auctions.title AS auction_title, invites.email, invites.phone_number, invites.status, invites.expires_at, invites.accepted_at, invites.created_at FROM invites JOIN tenants ON tenants.id = invites.tenant_id LEFT JOIN auctions ON auctions.id = invites.auction_id WHERE ($1::text IS NULL OR tenants.slug = $1) ORDER BY invites.created_at DESC LIMIT 25`, [tenantSlug ?? null]);
  return result.rows.map(mapInvite);
}
async function getRecentBids(app: FastifyInstance, tenantSlug?: string): Promise<AdminBidSummary[]> {
  const result = await app.db.query<BidRow>(`SELECT bids.id, bids.tenant_id, tenants.slug AS tenant_slug, bids.auction_id, auctions.title AS auction_title, bids.item_id, auction_items.title AS item_title, bids.bidder_user_id, users.display_name AS bidder_display_name, bids.amount_cents, bids.status, bids.created_at FROM bids JOIN tenants ON tenants.id = bids.tenant_id JOIN auctions ON auctions.id = bids.auction_id JOIN auction_items ON auction_items.id = bids.item_id JOIN users ON users.id = bids.bidder_user_id WHERE ($1::text IS NULL OR tenants.slug = $1) ORDER BY bids.created_at DESC LIMIT 25`, [tenantSlug ?? null]);
  return result.rows.map(mapBid);
}
function buildMetrics(counts: Record<string, number>): AdminMetric[] { return [{ label: "Tenants", value: counts.tenants ?? 0, detail: "Client organizations" }, { label: "Auctions", value: counts.auctions ?? 0, detail: "Scheduled and active events" }, { label: "Items", value: counts.items ?? 0, detail: "Lots available for bidding" }, { label: "Invites", value: counts.invites ?? 0, detail: "Bidder registration entry points" }, { label: "Bids", value: counts.bids ?? 0, detail: "Immutable bid records" }]; }

async function tenantExists(app: FastifyInstance, tenantId: string): Promise<void> { const found = await app.db.query<IdRow>("SELECT id FROM tenants WHERE id = $1", [tenantId]); if (!found.rows[0]) throw new AdminInputError("Tenant was not found.", 404, "TENANT_NOT_FOUND"); }
async function getTenantSlugById(app: FastifyInstance, tenantId: string): Promise<string> { const found = await app.db.query<{ slug: string }>("SELECT slug FROM tenants WHERE id = $1", [tenantId]); if (!found.rows[0]) throw new AdminInputError("Tenant was not found.", 404, "TENANT_NOT_FOUND"); return found.rows[0].slug; }
async function auctionBelongsToTenant(app: FastifyInstance, tenantId: string, auctionId: string): Promise<void> { const found = await app.db.query<IdRow>("SELECT id FROM auctions WHERE id = $1 AND tenant_id = $2", [auctionId, tenantId]); if (!found.rows[0]) throw new AdminInputError("Auction was not found for this tenant.", 404, "AUCTION_NOT_FOUND"); }

export async function registerAdminRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", async (request, reply) => { if (request.url.startsWith("/admin/")) await requireAdmin(request, reply); });

  app.get("/admin/platform/overview", async (request): Promise<ApiEnvelope<AdminPlatformOverview>> => {
    const [tenantCount, auctionCount, itemCount, inviteCount, bidCount, tenants, auctions, recentBids] = await Promise.all([getCount(app, "tenants"), getCount(app, "auctions"), getCount(app, "auction_items"), getCount(app, "invites"), getCount(app, "bids"), getTenants(app), getAuctions(app), getRecentBids(app)]);
    return { data: { metrics: buildMetrics({ tenants: tenantCount, auctions: auctionCount, items: itemCount, invites: inviteCount, bids: bidCount }), tenants, auctions, recentBids, notificationPersistenceEnabled: false }, requestId: request.id };
  });

  app.get<{ Querystring: { tenantSlug?: string } }>("/admin/tenant/overview", async (request, reply): Promise<ApiEnvelope<AdminTenantOverview> | void> => {
    const tenantSlug = request.query.tenantSlug ?? "demo-charity";
    const [tenant] = await getTenants(app, tenantSlug);
    if (!tenant) return sendError(reply, request, 404, "TENANT_NOT_FOUND", "Tenant workspace was not found.");
    const [auctions, items, invites, recentBids] = await Promise.all([getAuctions(app, tenantSlug), getItems(app, tenantSlug), getInvites(app, tenantSlug), getRecentBids(app, tenantSlug)]);
    return { data: { tenant, metrics: buildMetrics({ tenants: 1, auctions: tenant.auctionCount, items: tenant.itemCount, invites: tenant.inviteCount, bids: tenant.bidCount }), auctions, items, invites, recentBids, embedPreviewUrls: auctions.map((auction) => `/embed/t/${tenant.slug}/a/${auction.slug}`), notificationPersistenceEnabled: false }, requestId: request.id };
  });

  app.post<{ Body: AdminCreateTenantRequest }>("/admin/platform/tenants", async (request, reply) => {
    try {
      if (!isObject(request.body)) throw new AdminInputError("Request body is required.");
      const slug = requireSlug(asString(request.body.slug) ?? "");
      const name = asString(request.body.name); if (!name) throw new AdminInputError("Tenant name is required.");
      const status = (asString(request.body.status) ?? "active") as TenantStatus; if (!tenantStatuses.includes(status)) throw new AdminInputError("Tenant status is invalid.");
      const origins = validateOrigins(asStringArray(request.body.allowedEmbedOrigins));
      await app.db.query("INSERT INTO tenants (slug, name, status, allowed_embed_origins) VALUES ($1, $2, $3, $4)", [slug, name, status, origins]);
      const [tenant] = await getTenants(app, slug); reply.code(201); return { data: tenant, requestId: request.id };
    } catch (error) { if (error instanceof AdminInputError) return sendError(reply, request, error.statusCode, error.code, error.message); throw error; }
  });

  app.patch<{ Params: { tenantId: string }; Body: AdminUpdateTenantRequest }>("/admin/platform/tenants/:tenantId", async (request, reply) => {
    try {
      requireUuid(request.params.tenantId, "tenantId"); await tenantExists(app, request.params.tenantId);
      if (!isObject(request.body)) throw new AdminInputError("Request body is required.");
      const name = asString(request.body.name); const status = asString(request.body.status) as TenantStatus | undefined;
      if (status && !tenantStatuses.includes(status)) throw new AdminInputError("Tenant status is invalid.");
      const origins = request.body.allowedEmbedOrigins === undefined ? undefined : validateOrigins(asStringArray(request.body.allowedEmbedOrigins));
      await app.db.query("UPDATE tenants SET name = COALESCE($2, name), status = COALESCE($3, status), allowed_embed_origins = COALESCE($4, allowed_embed_origins), updated_at = now() WHERE id = $1", [request.params.tenantId, name ?? null, status ?? null, origins ?? null]);
      const slug = await getTenantSlugById(app, request.params.tenantId); const [tenant] = await getTenants(app, slug); return { data: tenant, requestId: request.id };
    } catch (error) { if (error instanceof AdminInputError) return sendError(reply, request, error.statusCode, error.code, error.message); throw error; }
  });

  app.post<{ Params: { tenantId: string }; Body: AdminCreateUserRequest }>("/admin/platform/tenants/:tenantId/admin-users", async (request, reply) => {
    try {
      requireUuid(request.params.tenantId, "tenantId"); await tenantExists(app, request.params.tenantId);
      if (!isObject(request.body)) throw new AdminInputError("Request body is required.");
      const displayName = asString(request.body.displayName); if (!displayName) throw new AdminInputError("Display name is required.");
      const email = asString(request.body.email)?.toLowerCase(); const phone = asString(request.body.phoneNumber);
      if (!email && !phone) throw new AdminInputError("Email or phone number is required.");
      const roles = asStringArray(request.body.roles) as UserRole[] | undefined;
      if (!roles?.length || roles.some((role) => !userRoles.includes(role))) throw new AdminInputError("At least one valid role is required.");
      const result = await app.db.query<UserRow>("INSERT INTO users (tenant_id, email, phone_number, display_name, roles) VALUES ($1, $2, $3, $4, $5) RETURNING *", [request.params.tenantId, email ?? null, phone ?? null, displayName, roles]);
      reply.code(201); return { data: mapUser(result.rows[0]!), requestId: request.id };
    } catch (error) { if (error instanceof AdminInputError) return sendError(reply, request, error.statusCode, error.code, error.message); throw error; }
  });

  app.post<{ Params: { tenantId: string }; Body: AdminCreateAuctionRequest }>("/admin/tenants/:tenantId/auctions", async (request, reply) => {
    try {
      requireUuid(request.params.tenantId, "tenantId"); await tenantExists(app, request.params.tenantId); if (!isObject(request.body)) throw new AdminInputError("Request body is required.");
      const slug = requireSlug(asString(request.body.slug) ?? ""); const title = asString(request.body.title); if (!title) throw new AdminInputError("Auction title is required.");
      const status = (asString(request.body.status) ?? "draft") as AuctionStatus; if (!auctionStatuses.includes(status)) throw new AdminInputError("Auction status is invalid.");
      const startsAt = requireDate(asString(request.body.startsAt) ?? "", "startsAt"); const endsAt = requireDate(asString(request.body.endsAt) ?? "", "endsAt"); if (endsAt <= startsAt) throw new AdminInputError("endsAt must be after startsAt.");
      await app.db.query("INSERT INTO auctions (tenant_id, slug, title, description, status, starts_at, ends_at, currency, timezone) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)", [request.params.tenantId, slug, title, asString(request.body.description) ?? null, status, startsAt, endsAt, validateCurrency(asString(request.body.currency)), validateTimezone(asString(request.body.timezone))]);
      const tenantSlug = await getTenantSlugById(app, request.params.tenantId); const auction = (await getAuctions(app, tenantSlug)).find((entry) => entry.slug === slug); reply.code(201); return { data: auction, requestId: request.id };
    } catch (error) { if (error instanceof AdminInputError) return sendError(reply, request, error.statusCode, error.code, error.message); throw error; }
  });

  app.patch<{ Params: { tenantId: string; auctionId: string }; Body: AdminUpdateAuctionRequest }>("/admin/tenants/:tenantId/auctions/:auctionId", async (request, reply) => {
    try {
      requireUuid(request.params.tenantId, "tenantId"); requireUuid(request.params.auctionId, "auctionId"); await auctionBelongsToTenant(app, request.params.tenantId, request.params.auctionId); if (!isObject(request.body)) throw new AdminInputError("Request body is required.");
      const slug = request.body.slug === undefined ? undefined : requireSlug(asString(request.body.slug) ?? ""); const status = asString(request.body.status) as AuctionStatus | undefined; if (status && !auctionStatuses.includes(status)) throw new AdminInputError("Auction status is invalid.");
      await app.db.query("UPDATE auctions SET slug = COALESCE($3, slug), title = COALESCE($4, title), description = COALESCE($5, description), status = COALESCE($6, status), starts_at = COALESCE($7, starts_at), ends_at = COALESCE($8, ends_at), currency = COALESCE($9, currency), timezone = COALESCE($10, timezone), updated_at = now() WHERE tenant_id = $1 AND id = $2", [request.params.tenantId, request.params.auctionId, slug ?? null, asString(request.body.title) ?? null, asString(request.body.description) ?? null, status ?? null, request.body.startsAt ? requireDate(asString(request.body.startsAt)!, "startsAt") : null, request.body.endsAt ? requireDate(asString(request.body.endsAt)!, "endsAt") : null, request.body.currency ? validateCurrency(asString(request.body.currency)) : null, request.body.timezone ? validateTimezone(asString(request.body.timezone)) : null]);
      const tenantSlug = await getTenantSlugById(app, request.params.tenantId); const auction = (await getAuctions(app, tenantSlug)).find((entry) => entry.id === request.params.auctionId); return { data: auction, requestId: request.id };
    } catch (error) { if (error instanceof AdminInputError) return sendError(reply, request, error.statusCode, error.code, error.message); throw error; }
  });

  app.post<{ Params: { tenantId: string; auctionId: string }; Body: AdminCreateAuctionItemRequest }>("/admin/tenants/:tenantId/auctions/:auctionId/items", async (request, reply) => {
    try {
      requireUuid(request.params.tenantId, "tenantId"); requireUuid(request.params.auctionId, "auctionId"); await auctionBelongsToTenant(app, request.params.tenantId, request.params.auctionId); if (!isObject(request.body)) throw new AdminInputError("Request body is required.");
      const title = asString(request.body.title); const description = asString(request.body.description); if (!title || !description) throw new AdminInputError("Item title and description are required.");
      await app.db.query("INSERT INTO auction_items (tenant_id, auction_id, lot_number, title, description, image_urls, starting_bid_cents, minimum_bid_increment_cents, fair_market_value_cents) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)", [request.params.tenantId, request.params.auctionId, asString(request.body.lotNumber) ?? null, title, description, asStringArray(request.body.imageUrls) ?? [], requireCents(asNumber(request.body.startingBidCents), "startingBidCents", true), requireCents(asNumber(request.body.minimumBidIncrementCents), "minimumBidIncrementCents", false), request.body.fairMarketValueCents === undefined ? null : requireCents(asNumber(request.body.fairMarketValueCents), "fairMarketValueCents", true)]);
      const tenantSlug = await getTenantSlugById(app, request.params.tenantId); reply.code(201); return { data: await getItems(app, tenantSlug), requestId: request.id };
    } catch (error) { if (error instanceof AdminInputError) return sendError(reply, request, error.statusCode, error.code, error.message); throw error; }
  });

  app.patch<{ Params: { tenantId: string; itemId: string }; Body: AdminUpdateAuctionItemRequest }>("/admin/tenants/:tenantId/items/:itemId", async (request, reply) => {
    try {
      requireUuid(request.params.tenantId, "tenantId"); requireUuid(request.params.itemId, "itemId"); if (!isObject(request.body)) throw new AdminInputError("Request body is required.");
      await app.db.query("UPDATE auction_items SET lot_number = COALESCE($3, lot_number), title = COALESCE($4, title), description = COALESCE($5, description), image_urls = COALESCE($6, image_urls), starting_bid_cents = COALESCE($7, starting_bid_cents), minimum_bid_increment_cents = COALESCE($8, minimum_bid_increment_cents), fair_market_value_cents = COALESCE($9, fair_market_value_cents), updated_at = now() WHERE tenant_id = $1 AND id = $2", [request.params.tenantId, request.params.itemId, asString(request.body.lotNumber) ?? null, asString(request.body.title) ?? null, asString(request.body.description) ?? null, asStringArray(request.body.imageUrls) ?? null, request.body.startingBidCents === undefined ? null : requireCents(asNumber(request.body.startingBidCents), "startingBidCents", true), request.body.minimumBidIncrementCents === undefined ? null : requireCents(asNumber(request.body.minimumBidIncrementCents), "minimumBidIncrementCents", false), request.body.fairMarketValueCents === undefined ? null : requireCents(asNumber(request.body.fairMarketValueCents), "fairMarketValueCents", true)]);
      const tenantSlug = await getTenantSlugById(app, request.params.tenantId); return { data: await getItems(app, tenantSlug), requestId: request.id };
    } catch (error) { if (error instanceof AdminInputError) return sendError(reply, request, error.statusCode, error.code, error.message); throw error; }
  });

  app.delete<{ Params: { tenantId: string; itemId: string } }>("/admin/tenants/:tenantId/items/:itemId", async (request, reply) => {
    try {
      requireUuid(request.params.tenantId, "tenantId"); requireUuid(request.params.itemId, "itemId");
      const bidCount = await app.db.query<CountRow>("SELECT COUNT(*) AS count FROM bids WHERE tenant_id = $1 AND item_id = $2", [request.params.tenantId, request.params.itemId]);
      if (toCount(bidCount.rows[0]?.count ?? 0) > 0) throw new AdminInputError("Items with bids cannot be deleted.", 409, "ITEM_HAS_BIDS");
      await app.db.query("DELETE FROM auction_items WHERE tenant_id = $1 AND id = $2", [request.params.tenantId, request.params.itemId]);
      return { data: { deleted: true }, requestId: request.id };
    } catch (error) { if (error instanceof AdminInputError) return sendError(reply, request, error.statusCode, error.code, error.message); throw error; }
  });

  app.post<{ Params: { tenantId: string }; Body: AdminCreateInviteRequest }>("/admin/tenants/:tenantId/invites", async (request, reply): Promise<ApiEnvelope<AdminCreateInviteResult> | void> => {
    try {
      requireUuid(request.params.tenantId, "tenantId"); await tenantExists(app, request.params.tenantId); if (!isObject(request.body)) throw new AdminInputError("Request body is required.");
      const auctionId = asString(request.body.auctionId); if (auctionId) { requireUuid(auctionId, "auctionId"); await auctionBelongsToTenant(app, request.params.tenantId, auctionId); }
      const email = asString(request.body.email)?.toLowerCase(); const phone = asString(request.body.phoneNumber); if (!email && !phone) throw new AdminInputError("Email or phone number is required.");
      const creatorId = asString(request.body.createdByUserId); if (creatorId) requireUuid(creatorId, "createdByUserId");
      const fallbackCreator = await app.db.query<IdRow>("SELECT id FROM users WHERE tenant_id = $1 AND roles && ARRAY['tenant_admin','auction_manager','platform_admin']::text[] ORDER BY created_at ASC LIMIT 1", [request.params.tenantId]);
      const createdBy = creatorId ?? fallbackCreator.rows[0]?.id; if (!createdBy) throw new AdminInputError("Create an admin or auction manager user before creating invites.");
      const token = randomBytes(32).toString("base64url"); const tokenHash = createHash("sha256").update(token).digest("hex"); const expiresAt = request.body.expiresAt ? requireDate(asString(request.body.expiresAt)!, "expiresAt") : new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);
      await app.db.query("INSERT INTO invites (tenant_id, auction_id, email, phone_number, token_hash, expires_at, created_by_user_id) VALUES ($1,$2,$3,$4,$5,$6,$7)", [request.params.tenantId, auctionId ?? null, email ?? null, phone ?? null, tokenHash, expiresAt, createdBy]);
      const tenantSlug = await getTenantSlugById(app, request.params.tenantId); const invite = (await getInvites(app, tenantSlug))[0]!; const inviteUrl = `${app.config.publicAppUrl.replace(/\/$/, "")}/invite/${token}`;
      reply.code(201); return { data: { invite, token, inviteUrl }, requestId: request.id };
    } catch (error) { if (error instanceof AdminInputError) return sendError(reply, request, error.statusCode, error.code, error.message); throw error; }
  });
}
