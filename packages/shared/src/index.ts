export type Identifier = string;
export type IsoDateTime = string;

export type TenantStatus = "active" | "suspended" | "archived";
export type AuctionStatus = "draft" | "scheduled" | "open" | "closing" | "closed" | "settled";
export type InviteStatus = "pending" | "accepted" | "expired" | "revoked";
export type BidStatus = "accepted" | "outbid" | "retracted" | "winning";
export type NotificationChannel = "email" | "sms";
export type NotificationStatus = "queued" | "sending" | "sent" | "failed" | "skipped";
export type UserRole = "platform_admin" | "tenant_admin" | "auction_manager" | "bidder";

export interface Tenant {
  id: Identifier;
  slug: string;
  name: string;
  status: TenantStatus;
  allowedEmbedOrigins: string[];
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface Auction {
  id: Identifier;
  tenantId: Identifier;
  slug: string;
  title: string;
  description?: string;
  status: AuctionStatus;
  startsAt: IsoDateTime;
  endsAt: IsoDateTime;
  currency: string;
  timezone: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface AuctionItem {
  id: Identifier;
  tenantId: Identifier;
  auctionId: Identifier;
  lotNumber?: string;
  title: string;
  description: string;
  imageUrls: string[];
  startingBidCents: number;
  minimumBidIncrementCents: number;
  fairMarketValueCents?: number;
  currentBidCents?: number;
  winningBidId?: Identifier;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface User {
  id: Identifier;
  tenantId: Identifier;
  email?: string;
  phoneNumber?: string;
  displayName: string;
  roles: UserRole[];
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface Invite {
  id: Identifier;
  tenantId: Identifier;
  auctionId?: Identifier;
  email?: string;
  phoneNumber?: string;
  tokenHash: string;
  status: InviteStatus;
  expiresAt: IsoDateTime;
  acceptedAt?: IsoDateTime;
  createdByUserId: Identifier;
  createdAt: IsoDateTime;
}

export interface Bid {
  id: Identifier;
  tenantId: Identifier;
  auctionId: Identifier;
  itemId: Identifier;
  bidderUserId: Identifier;
  amountCents: number;
  status: BidStatus;
  idempotencyKey: string;
  createdAt: IsoDateTime;
}

export interface NotificationRecord {
  id: Identifier;
  tenantId: Identifier;
  channel: NotificationChannel;
  status: NotificationStatus;
  templateKey: string;
  recipientUserId?: Identifier;
  recipientAddress: string;
  providerMessageId?: string;
  errorMessage?: string;
  queuedAt: IsoDateTime;
  sentAt?: IsoDateTime;
}

export interface PublicAuctionSummary {
  tenantSlug: string;
  auctionSlug: string;
  title: string;
  description?: string;
  status: AuctionStatus;
  startsAt: IsoDateTime;
  endsAt: IsoDateTime;
  currency: string;
}

export interface PublicAuctionItemSummary {
  id: Identifier;
  lotNumber?: string;
  title: string;
  description: string;
  imageUrls: string[];
  currentBidCents?: number;
  minimumBidIncrementCents: number;
}

export interface ApiEnvelope<T> {
  data: T;
  requestId: string;
}

export interface AdminMetric {
  label: string;
  value: number;
  detail?: string;
}

export interface AdminPlatformTenantSummary {
  id: Identifier;
  slug: string;
  name: string;
  status: TenantStatus;
  allowedEmbedOrigins: string[];
  auctionCount: number;
  itemCount: number;
  inviteCount: number;
  bidCount: number;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface AdminAuctionSummary {
  id: Identifier;
  tenantId: Identifier;
  tenantSlug: string;
  tenantName: string;
  slug: string;
  title: string;
  status: AuctionStatus;
  startsAt: IsoDateTime;
  endsAt: IsoDateTime;
  currency: string;
  timezone: string;
  itemCount: number;
  bidCount: number;
  highBidCents?: number;
}

export interface AdminAuctionItemSummary {
  id: Identifier;
  auctionId: Identifier;
  lotNumber?: string;
  title: string;
  startingBidCents: number;
  minimumBidIncrementCents: number;
  fairMarketValueCents?: number;
  currentBidCents?: number;
  bidCount: number;
}

export interface AdminInviteSummary {
  id: Identifier;
  tenantId: Identifier;
  tenantSlug: string;
  auctionId?: Identifier;
  auctionTitle?: string;
  email?: string;
  phoneNumber?: string;
  status: InviteStatus;
  expiresAt: IsoDateTime;
  acceptedAt?: IsoDateTime;
  createdAt: IsoDateTime;
}

export interface AdminBidSummary {
  id: Identifier;
  tenantId: Identifier;
  tenantSlug: string;
  auctionId: Identifier;
  auctionTitle: string;
  itemId: Identifier;
  itemTitle: string;
  bidderUserId: Identifier;
  bidderDisplayName: string;
  amountCents: number;
  status: BidStatus;
  createdAt: IsoDateTime;
}

export interface AdminPlatformOverview {
  metrics: AdminMetric[];
  tenants: AdminPlatformTenantSummary[];
  auctions: AdminAuctionSummary[];
  recentBids: AdminBidSummary[];
  notificationPersistenceEnabled: boolean;
}

export interface AdminTenantOverview {
  tenant: AdminPlatformTenantSummary;
  metrics: AdminMetric[];
  auctions: AdminAuctionSummary[];
  items: AdminAuctionItemSummary[];
  invites: AdminInviteSummary[];
  recentBids: AdminBidSummary[];
  embedPreviewUrls: string[];
  notificationPersistenceEnabled: boolean;
}

export interface AdminCreateTenantRequest {
  slug: string;
  name: string;
  status?: TenantStatus;
  allowedEmbedOrigins?: string[];
}

export interface AdminUpdateTenantRequest {
  name?: string;
  status?: TenantStatus;
  allowedEmbedOrigins?: string[];
}

export interface AdminCreateUserRequest {
  email?: string;
  phoneNumber?: string;
  displayName: string;
  roles: UserRole[];
}

export interface AdminUserSummary {
  id: Identifier;
  tenantId: Identifier;
  email?: string;
  phoneNumber?: string;
  displayName: string;
  roles: UserRole[];
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface AdminCreateAuctionRequest {
  slug: string;
  title: string;
  description?: string;
  status?: AuctionStatus;
  startsAt: IsoDateTime;
  endsAt: IsoDateTime;
  currency?: string;
  timezone?: string;
}

export interface AdminUpdateAuctionRequest {
  slug?: string;
  title?: string;
  description?: string;
  status?: AuctionStatus;
  startsAt?: IsoDateTime;
  endsAt?: IsoDateTime;
  currency?: string;
  timezone?: string;
}

export interface AdminCreateAuctionItemRequest {
  lotNumber?: string;
  title: string;
  description: string;
  imageUrls?: string[];
  startingBidCents: number;
  minimumBidIncrementCents: number;
  fairMarketValueCents?: number;
}

export interface AdminUpdateAuctionItemRequest {
  lotNumber?: string;
  title?: string;
  description?: string;
  imageUrls?: string[];
  startingBidCents?: number;
  minimumBidIncrementCents?: number;
  fairMarketValueCents?: number;
}

export interface AdminCreateInviteRequest {
  auctionId?: Identifier;
  email?: string;
  phoneNumber?: string;
  expiresAt?: IsoDateTime;
  createdByUserId?: Identifier;
}

export interface AdminCreateInviteResult {
  invite: AdminInviteSummary;
  token: string;
  inviteUrl: string;
}

export const AUCTIONATION_EMBED_RESIZE_EVENT = "auctionation:embed:resize";