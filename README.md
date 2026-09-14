# Ticketing Backend

Ticketing backend: PayPal.me payment, QR-code ticket generation, email delivery, and ticket verification at the door.

## How it works

1. The visitor lands on the sales page (`/`), served directly by this backend, showing the event info and a small form (name + email).
2. Submitting the form calls `POST /api/create-reservation`, which creates a *pending* reservation in the database and returns a `paypal.me` payment link. The browser is redirected there immediately.
3. The visitor pays on PayPal. PayPal then sends an **IPN (Instant Payment Notification)** to `POST /api/paypal-ipn`.
4. The IPN handler verifies the notification with PayPal, checks the amount/currency, and matches it to the oldest pending reservation for that amount (PayPal.me payments aren't tied to a specific checkout session, so this is a best-effort match — see caveat below). It then generates a ticket (QR code) and emails it to the buyer.
5. On the day of the event, staff scan the QR code and call `POST /api/verify-ticket` to validate entry.

No external website is needed: the sales page is served by this same Express server from the `public/` folder.

**Caveat**: because `paypal.me` links aren't created through an API call, PayPal doesn't tell us *who* paid — only *how much*. Matching is done by "oldest pending reservation with a matching amount, reserved in the last 2 hours". This works well for normal traffic but can theoretically mismatch two buyers if several reservations for the exact same amount are pending at once and paid out of order. For a small one-off event this risk is low; keep an eye on `tickets.db` around the event if you want to double-check.

## Stack

- [Express](https://expressjs.com/) — HTTP server
- [PayPal.me](https://paypal.me/) + IPN — payment (no PayPal Developer app or API keys needed)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — ticket/reservation storage
- [qrcode](https://www.npmjs.com/package/qrcode) — QR code generation
- [Nodemailer](https://nodemailer.com/) + Gmail SMTP — email delivery (no custom domain needed)

## Setup

```bash
npm install
cp .env.example .env
```

Fill in the variables in `.env` (PayPal, Gmail, etc. — see table below).

## Running the server

```bash
npm start       # plain start
npm run dev     # with auto-reload (--watch)
```

The server listens on `http://localhost:4242` by default. The sales page is at `http://localhost:4242/`.

Edit `EVENT_NAME`, `EVENT_DATE`, `EVENT_LOCATION`, and `EVENT_DESCRIPTION` in `.env` to customize the content shown on the page (no code changes needed). To swap the logo, replace `public/logo.png`.

`EVENT_DESCRIPTION` supports raw HTML (e.g. `<strong>`, inline `style="..."`) and is split on the first blank line (`\n\n`): the first paragraph is shown as an always-visible title, everything after it is hidden behind a "Click me to know more" toggle button. Use `\n\n` between paragraphs (dotenv turns `\n` into a real newline inside double-quoted values), e.g.:

```
EVENT_DESCRIPTION="<strong>Welcome!</strong>\n\nFirst hidden paragraph.\n\nSecond hidden paragraph."
```

### Configuring PayPal IPN

1. Log into the PayPal account that will receive payments (a **Personal** account works, no Business account required).
2. Go to **Account Settings → Notifications → Instant Payment Notifications (IPN)** and click **Update**.
3. Set the notification URL to `https://your-domain.com/api/paypal-ipn` and turn IPN **on**.
4. Set `PAYPAL_ME_USERNAME` (your `paypal.me/<username>`) and `PAYPAL_RECEIVER_EMAIL` (the email on that PayPal account) in `.env`.
5. Test first with a [PayPal Sandbox](https://developer.paypal.com/tools/sandbox/) account and `PAYPAL_ENV=sandbox` before going live with `PAYPAL_ENV=live`.

IPN requires a **publicly reachable HTTPS URL** — it won't work against `localhost`, so this step can only be tested once deployed (or via a tunnel like `ngrok` during development).

### Configuring Gmail sending

1. Enable **2-Step Verification** on the Gmail account you want to send from (required for app passwords): [myaccount.google.com/security](https://myaccount.google.com/security).
2. Generate an **App Password** at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) (choose "Mail" / "Other").
3. Set `GMAIL_USER` to that Gmail address and `GMAIL_APP_PASSWORD` to the generated password in `.env`.
4. `EMAIL_FROM` must use the **same address** as `GMAIL_USER` — Gmail rejects a mismatched "from".

Gmail caps sending at ~500 emails/day on a regular account, which is far more than a single small event needs.

## Environment variables

| Variable | Description |
| --- | --- |
| `PAYPAL_ME_USERNAME` | Your `paypal.me/<username>`, used to build the payment link |
| `PAYPAL_RECEIVER_EMAIL` | Email on the receiving PayPal account, used to sanity-check incoming IPNs |
| `PAYPAL_ENV` | `sandbox` while testing, `live` for the real event |
| `TICKET_AMOUNT_CENTS` | Ticket price in cents |
| `TICKET_CURRENCY` | Ticket currency (e.g. `eur`) |
| `GMAIL_USER` | Gmail address tickets are sent from |
| `GMAIL_APP_PASSWORD` | Gmail App Password (not your normal password — see setup above) |
| `EMAIL_FROM` | Sender address for emails (must match `GMAIL_USER`) |
| `EVENT_NAME` | Event name (shown on the sales page and the ticket) |
| `EVENT_DATE` | Event date/time, shown on the sales page |
| `EVENT_LOCATION` | Event location, shown on the sales page |
| `EVENT_DESCRIPTION` | Description shown on the sales page — supports HTML; first paragraph is always visible, the rest is behind a "know more" toggle (see above) |
| `EVENT_INCLUDES` | Optional note on what's included, shown under the price (e.g. "Includes brunch + 1 welcome drink") |
| `PORT` | Server port (default `4242`) |
| `STAFF_API_KEY` | Secret key protecting `/api/verify-ticket` |

## Endpoints

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/api/create-reservation` | Creates a pending reservation and returns the `paypal.me` payment URL |
| `POST` | `/api/paypal-ipn` | Receives PayPal payment notifications (IPN-verified) |
| `POST` | `/api/verify-ticket` | Verifies and consumes a ticket (requires the `x-staff-key` header) |
| `GET` | `/api/event` | Returns the event info (used by the sales page) |
| `GET` | `/health` | Server health check |
| `GET` | `/` | Sales page (event info + reservation form) |

### Verifying a ticket

```bash
curl -X POST http://localhost:4242/api/verify-ticket \
  -H "Content-Type: application/json" \
  -H "x-staff-key: $STAFF_API_KEY" \
  -d '{"ticketId": "<ticket-id>"}'
```

## Database

Tickets/reservations are stored in a SQLite file `tickets.db` (created automatically on startup), with statuses `pending` (reserved, not yet paid), `valid` (paid), `used` (scanned at the door), and `cancelled`.

## Project structure

```
public/
├── index.html            # sales page (event info + reservation form)
├── style.css              # shared styling
└── logo.png                # event logo shown at the top of the sales page

src/
├── index.js            # entry point, mounts routes + static files
├── db.js                # SQLite access (reservations/tickets)
├── routes/
│   ├── reservation.js    # POST /api/create-reservation
│   ├── paypalIpn.js       # POST /api/paypal-ipn
│   ├── verify.js          # POST /api/verify-ticket
│   └── event.js            # GET /api/event
└── services/
    ├── ticket.js          # sends the ticket email for a paid reservation
    ├── qrcode.js           # QR code generation
    └── email.js            # sends the email with the ticket
```
