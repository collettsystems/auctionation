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

export const AUCTIONATION_EMBED_RESIZE_EVENT = "auctionation:embed:resize";