import Database from "better-sqlite3";

// En production (Render...), DB_PATH doit pointer vers un disque persistant
// (ex. /var/data/tickets.db) sinon les réservations/billets sont perdus à
// chaque redéploiement ou redémarrage.
const db = new Database(process.env.DB_PATH || "tickets.db");

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

// Utilisé par le tableau de bord admin : liste des réservations en attente
// de confirmation manuelle de paiement.
export function listPendingReservations() {
  return db
    .prepare(`SELECT * FROM tickets WHERE status = 'pending' ORDER BY created_at ASC`)
    .all();
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
