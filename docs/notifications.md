# Notifications

Auctionation supports email and SMS notifications to keep auction activity moving.

## Initial providers

- Email: SMTP relay through Graphmail-compatible settings using Nodemailer.
- SMS: provider interface only; implementation can be added later without changing domain flows.

## Notification events

- `invite.created`
- `invite.reminder`
- `bid.confirmation`
- `bid.outbid`
- `auction.endingSoon`
- `auction.winner`

## Recommended flow

1. API records the domain event.
2. API creates notification records/jobs.
3. Worker renders templates.
4. Worker sends via SMTP or SMS provider.
5. Delivery status is stored for auditing.

Do not block bid placement on provider calls. Bids should commit first, and notifications should process asynchronously.

## Compliance notes

- Respect SMS opt-out keywords such as `STOP`.
- Store consent and notification preferences.
- Avoid sending sensitive bid/account data in SMS.
- Keep delivery logs for support and auditability.