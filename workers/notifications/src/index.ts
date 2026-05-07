import { renderNotification, type NotificationJobPayload } from "@auctionation/notifications";

const demoPayload: NotificationJobPayload = {
  tenantId: "tenant_demo",
  auctionId: "auction_demo",
  channel: "email",
  templateKey: "invite.created",
  recipient: {
    email: "bidder@example.com",
    displayName: "Demo Bidder"
  },
  variables: {
    auctionTitle: "Spring Gala Silent Auction",
    inviteUrl: "https://app.example.com/invite/demo-token"
  }
};

async function main(): Promise<void> {
  const rendered = renderNotification(demoPayload);
  console.log("Auctionation notification worker scaffold is running.");
  console.log("Queue integration pending; rendered demo notification:", rendered);
}

await main();