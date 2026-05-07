import type { NotificationChannel } from "@auctionation/shared";

export type NotificationTemplateKey =
  | "invite.created"
  | "invite.reminder"
  | "bid.confirmation"
  | "bid.outbid"
  | "auction.endingSoon"
  | "auction.winner";

export interface NotificationRecipient {
  userId?: string;
  email?: string;
  phoneNumber?: string;
  displayName?: string;
}

export interface NotificationJobPayload {
  tenantId: string;
  auctionId?: string;
  itemId?: string;
  channel: NotificationChannel;
  templateKey: NotificationTemplateKey;
  recipient: NotificationRecipient;
  variables: Record<string, string | number | boolean | undefined>;
}

export interface RenderedNotification {
  subject?: string;
  text: string;
  html?: string;
}

export interface SmsProvider {
  sendSms(input: { to: string; body: string }): Promise<{ providerMessageId: string }>;
}

export class NotConfiguredSmsProvider implements SmsProvider {
  public async sendSms(): Promise<{ providerMessageId: string }> {
    throw new Error("SMS provider is not configured. Add a provider adapter such as Twilio or Vonage.");
  }
}

const templates: Record<NotificationTemplateKey, (payload: NotificationJobPayload) => RenderedNotification> = {
  "invite.created": (payload) => ({
    subject: "You're invited to bid",
    text: `You're invited to join ${payload.variables.auctionTitle ?? "an auction"}. Open your invite: ${payload.variables.inviteUrl ?? ""}`
  }),
  "invite.reminder": (payload) => ({
    subject: "Reminder: your auction invite is waiting",
    text: `Reminder: your invite for ${payload.variables.auctionTitle ?? "the auction"} is waiting. ${payload.variables.inviteUrl ?? ""}`
  }),
  "bid.confirmation": (payload) => ({
    subject: "Bid received",
    text: `Your bid of ${payload.variables.bidAmount ?? ""} was received for ${payload.variables.itemTitle ?? "this item"}.`
  }),
  "bid.outbid": (payload) => ({
    subject: "You've been outbid",
    text: `You've been outbid on ${payload.variables.itemTitle ?? "an item"}. Place a new bid: ${payload.variables.itemUrl ?? ""}`
  }),
  "auction.endingSoon": (payload) => ({
    subject: "Auction ending soon",
    text: `${payload.variables.auctionTitle ?? "The auction"} is ending soon. ${payload.variables.auctionUrl ?? ""}`
  }),
  "auction.winner": (payload) => ({
    subject: "You won an auction item",
    text: `Congratulations! You won ${payload.variables.itemTitle ?? "an auction item"}. ${payload.variables.checkoutUrl ?? ""}`
  })
};

export function renderNotification(payload: NotificationJobPayload): RenderedNotification {
  return templates[payload.templateKey](payload);
}