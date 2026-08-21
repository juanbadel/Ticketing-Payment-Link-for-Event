# Ticketing Backend

Ticketing backend: Stripe Checkout payment, QR-code ticket generation, email delivery, and ticket verification at the door.

## How it works

1. The visitor lands on the sales page (`/`), served directly by this backend, showing the event info and a buy button.
2. The button calls `POST /api/create-checkout-session` to get a Stripe payment URL, then redirects the browser to it.
3. Once payment is completed, Stripe sends a `checkout.session.completed` event to `POST /api/webhook`, and redirects the visitor to `SUCCESS_URL` (or `CANCEL_URL` if they cancel).
4. The webhook generates a ticket (with a QR code) and emails it to the buyer.
5. On the day of the event, staff scan the QR code and call `POST /api/verify-ticket` to validate entry.

No external website is needed: the sales page and the return pages (`merci.html` / `annule.html`) are served by this same Express server from the `public/` folder.

## Stack

- [Express](https://expressjs.com/) — HTTP server
- [Stripe](https://stripe.com/) — payment (Checkout + webhooks)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — ticket storage
- [qrcode](https://www.npmjs.com/package/qrcode) — QR code generation
- [Resend](https://resend.com/) — email delivery

## Setup

```bash
npm install
cp .env.example .env
```

Fill in the variables in `.env` (Stripe keys, Resend, etc.).

## Running the server

```bash
npm start       # plain start
npm run dev     # with auto-reload (--watch)
```

The server listens on `http://localhost:4242` by default. The sales page is at `http://localhost:4242/`.

Edit `EVENT_NAME`, `EVENT_DATE`, `EVENT_LOCATION`, and `EVENT_DESCRIPTION` in `.env` to customize the content shown on the page (no code changes needed).

### Deployment

Once the backend is deployed on a host (Render, Railway, VPS...) with a real domain:
1. Update `SUCCESS_URL` and `CANCEL_URL` in `.env` with that domain (e.g. `https://your-domain.com/merci.html`).
2. Configure the webhook endpoint in the Stripe dashboard to point to `https://your-domain.com/api/webhook`, and grab the matching `STRIPE_WEBHOOK_SECRET`.

### Stripe webhook locally

Use the [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward events to your local server:

```bash
stripe listen --forward-to localhost:4242/api/webhook
```

Copy the printed secret (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`.

## Environment variables

| Variable | Description |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PRICE_ID` | Existing Stripe Price ID (optional, otherwise price is set via `TICKET_AMOUNT_CENTS`) |
| `TICKET_AMOUNT_CENTS` | Ticket price in cents, used when `STRIPE_PRICE_ID` is not set |
| `TICKET_CURRENCY` | Ticket currency (e.g. `eur`) |
| `SUCCESS_URL` / `CANCEL_URL` | Redirect URLs after payment |
| `RESEND_API_KEY` | Resend API key for sending emails |
| `EMAIL_FROM` | Sender address for emails |
| `EVENT_NAME` | Event name (shown on the sales page, the ticket, and the Stripe product) |
| `EVENT_DATE` | Event date/time, shown on the sales page |
| `EVENT_LOCATION` | Event location, shown on the sales page |
| `EVENT_DESCRIPTION` | Description shown on the sales page |
| `PORT` | Server port (default `4242`) |
| `STAFF_API_KEY` | Secret key protecting `/api/verify-ticket` |

## Endpoints

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/api/create-checkout-session` | Creates a Stripe payment session and returns the payment URL |
| `POST` | `/api/webhook` | Receives Stripe events (signature verified) |
| `POST` | `/api/verify-ticket` | Verifies and consumes a ticket (requires the `x-staff-key` header) |
| `GET` | `/api/event` | Returns the event info (used by the sales page) |
| `GET` | `/health` | Server health check |
| `GET` | `/` | Sales page (event info + buy button) |

### Verifying a ticket

```bash
curl -X POST http://localhost:4242/api/verify-ticket \
  -H "Content-Type: application/json" \
  -H "x-staff-key: $STAFF_API_KEY" \
  -d '{"ticketId": "<ticket-id>"}'
```

## Database

Tickets are stored in a SQLite file `tickets.db` (created automatically on startup), with statuses `valid`, `used`, and `cancelled`.

## Project structure

```
public/
├── index.html            # sales page (event info + buy button)
├── merci.html             # return page after a successful payment
└── annule.html            # return page after a cancelled payment

src/
├── index.js            # entry point, mounts routes + static files
├── db.js                # SQLite access (tickets)
├── stripe.js             # Stripe client
├── routes/
│   ├── checkout.js       # POST /api/create-checkout-session
│   ├── webhook.js        # POST /api/webhook
│   ├── verify.js         # POST /api/verify-ticket
│   └── event.js           # GET /api/event
└── services/
    ├── ticket.js          # issues a ticket from a Stripe session
    ├── qrcode.js           # QR code generation
    └── email.js            # sends the email with the ticket
```
