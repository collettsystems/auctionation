# Security Notes

## Tenant isolation

Every query must scope by `tenant_id`. Public embed endpoints should resolve tenant by slug and never expose admin-only fields.

## Invites

- Generate cryptographically secure random tokens.
- Store only token hashes.
- Set expiration dates.
- Mark accepted/revoked/expired state.
- Scope invites to tenant and optionally auction.

## Bidding

- Use transactions when accepting bids.
- Enforce auction open/close state server-side.
- Enforce minimum increment server-side.
- Use idempotency keys to prevent duplicate bids.
- Keep immutable bid history for auditability.

## Embedding

- Maintain per-tenant allowed origins.
- Use iframe isolation.
- Validate postMessage origins.
- Add rate limits to public endpoints.

## Notifications

- Respect email/SMS preferences.
- Track consent for SMS.
- Process provider webhooks securely.
- Avoid leaking sensitive data through notification channels.