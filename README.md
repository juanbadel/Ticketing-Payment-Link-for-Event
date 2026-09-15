# Ticketing Backend

Ticketing backend: PayPal.me payment, manual payment confirmation, QR-code ticket generation, email delivery, and ticket verification at the door.

## How it works

1. The visitor lands on the sales page (`/`), served directly by this backend, showing the event info and a small form (name + email).
2. Submitting the form calls `POST /api/create-reservation`, which creates a *pending* reservation in the database and returns a `paypal.me` payment link. The browser is redirected there immediately.
3. The visitor pays on PayPal.
4. The organizer checks their own PayPal account for the incoming payment, then opens `/admin.html`, enters the staff key, finds the matching pending reservation, and clicks **"Confirm payment & send ticket"**. This marks the reservation as paid and emails the ticket (QR code) to the buyer.
5. On the day of the event, staff scan the QR code and call `POST /api/verify-ticket` to validate entry.

No external website is needed: the sales page and admin page are served by this same Express server from the `public/` folder.

**Why manual confirmation?** `paypal.me` payments aren't tied to an API call, so PayPal can't automatically tell this server "payment X is for reservation Y" without either a PayPal Business account (for the Checkout API) or IPN notifications (whose settings PayPal generally only exposes to Business accounts too). Confirming manually avoids needing a Business account entirely — for a small one-off event, checking a handful of payments by hand is simple and reliable.

## Stack

- [Express](https://expressjs.com/) — HTTP server
- [PayPal.me](https://paypal.me/) — payment link (no PayPal Developer app, API keys, or Business account needed)
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

### Confirming payments (`/admin.html`)

1. Set `PAYPAL_ME_USERNAME` in `.env` to your `paypal.me/<username>`.
2. Open `https://<your-domain>/admin.html`, enter `STAFF_API_KEY` when prompted (it's remembered for the browser session).
3. When a buyer pays, check your PayPal account (app or website) for the incoming payment, then find the matching reservation on the admin page (same name/email/amount) and click **"Confirm payment & send ticket"**.

This works identically in local dev (`http://localhost:4242/admin.html`) and once deployed.

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
| `DB_PATH` | Path to the SQLite file (default `./tickets.db`). In production, point this to a persistent disk — see [Deploying on Render](#deploying-on-render) |
| `STAFF_API_KEY` | Secret key protecting `/api/verify-ticket` and the `/admin.html` payment-confirmation page |

## Endpoints

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/api/create-reservation` | Creates a pending reservation and returns the `paypal.me` payment URL |
| `GET` | `/api/admin/reservations` | Lists pending reservations (requires the `x-staff-key` header) |
| `POST` | `/api/admin/reservations/:id/confirm` | Marks a reservation paid and emails the ticket (requires the `x-staff-key` header) |
| `POST` | `/api/verify-ticket` | Verifies and consumes a ticket (requires the `x-staff-key` header) |
| `GET` | `/api/event` | Returns the event info (used by the sales page) |
| `GET` | `/health` | Server health check |
| `GET` | `/` | Sales page (event info + reservation form) |
| `GET` | `/admin.html` | Payment confirmation page for the organizer |

### Verifying a ticket

```bash
curl -X POST http://localhost:4242/api/verify-ticket \
  -H "Content-Type: application/json" \
  -H "x-staff-key: $STAFF_API_KEY" \
  -d '{"ticketId": "<ticket-id>"}'
```

## Database

Tickets/reservations are stored in a SQLite file (path set by `DB_PATH`, default `./tickets.db`, created automatically on startup), with statuses `pending` (reserved, not yet paid), `valid` (paid), `used` (scanned at the door), and `cancelled`.

## Deploying on Render

1. Push the repo to GitHub, then create a **Web Service** on Render pointing to it.
   - Build command: `npm install`
   - Start command: `npm start`
2. Add all variables from `.env` under the service's **Environment** settings.
3. Add a **persistent Disk** (Advanced → Add Disk), mounted at e.g. `/var/data`, and set `DB_PATH=/var/data/tickets.db` in the environment variables. Without this, `tickets.db` lives on the ephemeral filesystem and every reservation/ticket is lost on redeploy or restart.
4. Once deployed, confirm payments at `https://<your-service>.onrender.com/admin.html`.

## Project structure

```
public/
├── index.html            # sales page (event info + reservation form)
├── admin.html             # payment confirmation page for the organizer
├── style.css               # shared styling
└── logo.png                 # event logo shown at the top of the sales page

src/
├── index.js            # entry point, mounts routes + static files
├── db.js                # SQLite access (reservations/tickets)
├── routes/
│   ├── reservation.js    # POST /api/create-reservation
│   ├── admin.js           # GET /api/admin/reservations, POST /api/admin/reservations/:id/confirm
│   ├── verify.js          # POST /api/verify-ticket
│   └── event.js            # GET /api/event
└── services/
    ├── ticket.js          # sends the ticket email for a paid reservation
    ├── qrcode.js           # QR code generation
    └── email.js            # sends the email with the ticket
```
