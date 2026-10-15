# T-Shirt Sales Portal

Next.js App Router + TypeScript + Prisma/PostgreSQL seller portal with transaction-safe stock/quota enforcement and an outbox-backed SMS queue.

## Setup

1. Copy `.env.example` to `.env`, configure PostgreSQL and Redis, and use a unique `SESSION_SECRET`.
2. Install and generate: `npm install && npx prisma generate`.
3. Apply migrations/triggers with `npm run db:migrate`, then run `npm run db:seed` to initialize stock data. Up to two administrators can register at `/admin/register`; registration closes after both slots are used.
4. Run the web server with `npm run dev`; run `npm run worker` in a separate process when Redis is enabled.

The default `console` SMS provider is safe for local development. Configure `ssl-wireless`, `bulksmsbd`, or `twilio` and their credentials through environment variables only.

## Security and deployment checklist

- Serve only behind HTTPS and keep `Secure` session cookies enabled in production.
- Use a dedicated PostgreSQL role with INSERT/SELECT permissions for append-only business tables; apply `prisma/triggers.sql` after migrations.
- Run the worker separately from the web process and monitor failed SMS logs.
- Rotate the seeded admin password immediately, restrict database/Redis networking, and configure backups.
- Run `npm run build`, `npm run lint`, and `npm audit` in CI. The audit command requires a registry that supports npm audit endpoints.
# TShirtSales-InventoryControl
