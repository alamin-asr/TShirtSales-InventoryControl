# T-Shirt Sales & Inventory Control

A secure seller portal for managing T-shirt inventory, assigning stock to selling points, recording sales, enforcing buyer purchase limits, and sending purchase notifications by SMS.

The application is built with Next.js App Router, TypeScript, Prisma, PostgreSQL, Redis, and BullMQ. Business-critical operations use PostgreSQL transactions, row locks, idempotency keys, immutable audit records, and database triggers to protect inventory and sales data.

## Highlights

- Seller, administrator, and scanner user roles.
- Central warehouse stock management by T-shirt size.
- Stock assignment from central inventory to individual selling points.
- Seller sales workflow with stock validation and transaction-safe deductions.
- Buyer purchase limit of five T-shirts per phone number.
- Idempotent sale creation to prevent duplicate orders from repeated requests.
- Public receipt pages with QR-code purchase verification.
- SMS purchase notifications with an outbox-style `SmsLog` record.
- Optional Redis/BullMQ background processing with automatic retry and exponential backoff.
- Console SMS provider for local development.
- Support for SSL Wireless, Bulk SMS BD, and Twilio providers.
- Session-based authentication using HTTP-only cookies.
- Argon2id password hashing.
- Audit logging for authentication, sales, stock operations, exports, and SMS events.
- PostgreSQL triggers that protect append-only tables and buyer purchase limits.
- Security headers including CSP, HSTS in production, clickjacking protection, and MIME sniffing protection.

## Technology stack

- **Framework:** Next.js 16 App Router
- **Language:** TypeScript
- **UI:** React 19, Tailwind CSS 4, Tailwind Turbopack integration
- **Database:** PostgreSQL
- **ORM:** Prisma 6
- **Authentication:** Custom database-backed sessions and Argon2id
- **Queue:** BullMQ with Redis
- **Validation:** Zod
- **QR codes:** `qrcode` and `qr-scanner`
- **SMS:** Console, SSL Wireless, Bulk SMS BD, or Twilio
- **Runtime tools:** Node.js, `tsx`, Prisma CLI, ESLint

## User roles

### Seller

Sellers operate from a registered selling point and can:

- Sign in through the seller login flow.
- View their selling-point stock.
- Create customer sales.
- Enter a buyer phone number and T-shirt size.
- Receive a generated order ID and public receipt URL.
- Trigger a purchase confirmation SMS.

The current seller sales API accepts exactly one T-shirt per purchase request. The database model supports multiple sale items, but the route currently validates that each request contains one size.

### Administrator

Administrators can:

- Sign in through the administrator login flow.
- View central stock and selling-point stock.
- Add stock to the central inventory.
- Assign stock to selling points.
- Review recent stock ledger entries.
- Review sales and audit activity.
- Export supported business data where enabled by the admin interface.

Only two administrators can register. Once two administrator accounts exist, the administrator registration flow closes automatically.

### Scanner

Scanner accounts are represented in the data model and are intended for purchase verification workflows. Scanner approval is tracked with the `scannerApproved` flag, and scan events are stored in `ScanRecord`.

## Application routes

| Route | Purpose |
| --- | --- |
| `/` | Public landing page and portal entry point |
| `/login` | Seller authentication |
| `/register` | Seller registration |
| `/dashboard` | Seller dashboard and selling-point operations |
| `/admin/login` | Administrator authentication |
| `/admin/register` | Administrator registration, limited to two accounts |
| `/admin` | Administrator dashboard |
| `/scanner` | Scanner interface |
| `/receipt/:orderId` | Public purchase receipt and QR verification page |

API handlers are organized under `src/app/api` by feature area:

- `auth` — login, registration, and session actions
- `seller` — seller stock and sales operations
- `admin` — administrator stock, sales, audit, and export operations
- `scanner` — purchase scanning and verification operations

## Inventory and sales rules

### Stock flow

1. An administrator adds inventory to central stock.
2. Central stock is assigned to a named selling point.
3. The assignment decreases central stock and increases selling-point stock in one serializable transaction.
4. The operation creates an immutable `ASSIGN` stock ledger entry and an audit log.
5. A seller creates a sale from the stock available at their selling point.
6. The sale transaction locks the relevant stock rows, deducts the sold quantity, creates the sale items, and records immutable `SALE` ledger entries.

Supported sizes are:

- `S`
- `M`
- `L`
- `XL`
- `XXL`

### Buyer purchase limit

Each buyer is tracked by phone number. A buyer may purchase a maximum of five T-shirts in total.

The limit is enforced at multiple layers:

- Application-level validation inside the sale transaction.
- Row locking on the buyer-limit record.
- A PostgreSQL check constraint requiring `total_bought` to remain between `0` and `5`.
- A trigger that prevents the counter from being decreased or the buyer phone number from being changed.

### Idempotency

Every sale request includes an idempotency key. If the same key is submitted again, the existing sale is returned instead of creating a duplicate order or deducting stock twice.

## SMS processing

After a successful sale, the application:

1. Creates an `SmsLog` record with status `QUEUED`.
2. Adds a job to the BullMQ `sms-queue` when Redis is configured.
3. Processes the message in the background worker.
4. Updates the SMS log with status, attempts, timestamps, and provider response.
5. Retries failed jobs up to five times using exponential backoff.

When `REDIS_URL` is not configured, the project falls back to in-process SMS execution. This is convenient for local development but a dedicated Redis worker is recommended for production.

The purchase message contains:

- Quantity purchased.
- Purchased sizes.
- Buyer total out of five.
- Remaining allowance or a limit-reached message.
- A public receipt URL.

## Project structure

```text
.
├── prisma/
│   ├── migrations/          Database migrations
│   ├── schema.prisma       Prisma models, enums, and relations
│   ├── seed.ts              Initializes admin state and central stock rows
│   └── triggers.sql         Immutability and database integrity triggers
├── public/                  Static assets
├── src/
│   ├── app/                 Next.js routes, pages, layouts, and API handlers
│   ├── components/          Reusable React components
│   ├── jobs/                BullMQ queue, SMS worker, and SMS providers
│   ├── lib/                 Database, security, validation, and SMS helpers
│   ├── server/              Server-side stock and sales services
│   ├── types/               Shared TypeScript types
│   └── middleware.ts        Security response headers
├── next.config.ts           Next.js and Tailwind Turbopack configuration
├── package.json             Scripts and dependencies
└── tsconfig.json            TypeScript configuration
```

## Data model overview

The Prisma schema contains the following principal models:

- `User` — seller, administrator, and scanner accounts.
- `AdminRegistrationState` — controls the two-account administrator registration limit.
- `Session` — server-side sessions associated with an HTTP-only cookie.
- `BuyerLimit` — cumulative buyer quantity by phone number.
- `Sale` — order header containing seller, selling point snapshot, buyer phone, and idempotency key.
- `SaleItem` — individual size records belonging to a sale.
- `ScanRecord` — scanner verification record for a sale.
- `CentralStock` — inventory held at the central warehouse by size.
- `SellingPointStock` — inventory allocated to each selling point by size.
- `StockLedger` — append-only stock movement history.
- `SmsLog` — SMS delivery state and provider responses.
- `AuditLog` — append-only security and business activity history.

Important enums include `Size`, `Role`, `LedgerType`, `SmsStatus`, and `AuditAction`.

## Prerequisites

Install the following before starting:

- Node.js compatible with the project's Next.js and TypeScript versions.
- npm.
- PostgreSQL.
- Redis, if background SMS processing is required.

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/alamin-asr/TShirtSales-InventoryControl.git
cd TShirtSales-InventoryControl
npm install
```

Generate the Prisma client:

```bash
npm run db:generate
```

## Environment variables

Create a `.env` file in the project root. At minimum, configure PostgreSQL:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
```

Optional application and queue settings:

```env
PUBLIC_APP_URL="http://localhost:3000"
REDIS_URL="redis://localhost:6379"
SMS_PROVIDER="console"
SMS_API_KEY=""
SMS_SENDER_ID=""
SMS_ACCOUNT_SID=""
```

### Environment variable reference

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by Prisma |
| `PUBLIC_APP_URL` | Recommended | Public origin used in receipt URLs and SMS messages |
| `REDIS_URL` | Optional | Redis connection string for BullMQ and the SMS worker |
| `SMS_PROVIDER` | Optional | `console`, `ssl-wireless`, `bulksmsbd`, or `twilio`; defaults to `console` |
| `SMS_API_KEY` | Provider-dependent | API key or authentication token for the selected provider |
| `SMS_SENDER_ID` | Provider-dependent | Sender ID or Twilio `From` number |
| `SMS_ACCOUNT_SID` | Twilio only | Twilio account SID |

Never commit credentials, database passwords, SMS keys, or production connection strings to the repository.

## Database setup

Apply committed migrations:

```bash
npm run db:migrate
```

Initialize central stock rows for all supported sizes and update administrator registration state:

```bash
npm run db:seed
```

Apply the PostgreSQL integrity triggers after migrations:

```bash
psql "$DATABASE_URL" -f prisma/triggers.sql
```

The trigger script protects the following append-only tables from updates and deletes:

- `sales`
- `sale_items`
- `stock_ledger`
- `audit_logs`

It also protects buyer-limit rules and creates the global sale-item serial sequence.

The seed script does **not** create administrator accounts. Administrators must use `/admin/register`, and registration closes after two administrators have been created.

## Running locally

Start the Next.js development server:

```bash
npm run dev
```

Open `http://localhost:3000` in a browser.

If Redis is configured, start the SMS worker in a second terminal:

```bash
npm run worker
```

For local development without Redis, the application logs SMS messages through the console provider and processes jobs in-process.

## Production commands

Build the application:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

Run the production SMS worker as a separate process when Redis is enabled:

```bash
npm run worker
```

## Available npm scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Next.js development server on all interfaces |
| `npm run build` | Create a production build |
| `npm start` | Start the production Next.js server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:migrate` | Deploy committed Prisma migrations |
| `npm run db:seed` | Initialize administrator state and central stock records |
| `npm run worker` | Start the BullMQ SMS worker |

## Security considerations

- Deploy behind HTTPS in production.
- Keep session cookies HTTP-only, `SameSite=Strict`, and secure in production.
- Use a strong, unique database password and restrict PostgreSQL network access.
- Restrict Redis network access and protect Redis with authentication/TLS where appropriate.
- Use a dedicated database role with the minimum permissions required by the deployment.
- Apply `prisma/triggers.sql` after migrations.
- Do not expose SMS credentials to the browser.
- Rotate any initial or temporary administrator credentials immediately.
- Monitor failed SMS jobs and review `SmsLog` and `AuditLog` records.
- Configure database backups and test restoration procedures.
- Review the Content Security Policy before adding external scripts, images, fonts, or API origins.
- Run dependency and security checks in CI.

## Operational notes

- The public receipt page is identified by the sale `orderId`, not the internal database UUID.
- Receipt QR codes point to `PUBLIC_APP_URL/receipt/:orderId`.
- Sales and stock operations use serializable transactions with row locks to reduce race conditions during concurrent requests.
- The database is the source of truth for inventory, buyer limits, sales, and audit history.
- Failed queue delivery does not remove the sale; SMS delivery should be monitored and retried independently.
- The default console SMS provider is safe for development but must be replaced with a configured provider for real customer notifications.

## Validation checklist

Before deploying, verify:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
npm run lint
npm run build
npm audit
```

Also verify that:

- PostgreSQL is reachable using the production `DATABASE_URL`.
- The trigger script has been applied successfully.
- Administrator registration closes after the second administrator.
- Central stock assignment cannot create negative stock.
- Selling-point sales cannot exceed available stock.
- A buyer cannot exceed five total T-shirts.
- Reusing an idempotency key does not create a duplicate sale.
- Redis worker jobs are processed and failed SMS attempts are visible.
- Receipt QR codes resolve to the configured public application URL.

## License

No license file is currently included in the repository. Add a license before distributing the project publicly.
