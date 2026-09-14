import Database from "better-sqlite3";

const db = new Database("tickets.db");

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT,
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending | valid | used | cancelled
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    paid_at TEXT,
    used_at TEXT
  );
`);

export function createReservation({ id, email, name, amountCents, currency }) {
  db.prepare(
    `INSERT INTO tickets (id, email, name, amount_cents, currency) VALUES (?, ?, ?, ?, ?)`
  ).run(id, email, name ?? null, amountCents, currency);
}

// Un paiement PayPal.me n'est pas rattaché à une réservation précise : on le
// rapproche de la plus ancienne réservation en attente avec le même montant,
// dans une fenêtre de 2h (pour éviter de piocher une réservation abandonnée).
export function findOldestPendingReservation({ amountCents, currency }) {
  return db
    .prepare(
      `SELECT * FROM tickets
       WHERE status = 'pending' AND amount_cents = ? AND currency = ?
         AND created_at >= datetime('now', '-2 hours')
       ORDER BY created_at ASC
       LIMIT 1`
    )
    .get(amountCents, currency);
}

export function markReservationPaid(id) {
  return db
    .prepare(
      `UPDATE tickets SET status = 'valid', paid_at = datetime('now') WHERE id = ? AND status = 'pending'`
    )
    .run(id);
}

export function getTicket(id) {
  return db.prepare("SELECT * FROM tickets WHERE id = ?").get(id);
}

export function markTicketUsed(id) {
  return db
    .prepare(
      `UPDATE tickets SET status = 'used', used_at = datetime('now') WHERE id = ? AND status = 'valid'`
    )
    .run(id);
}

export default db;
