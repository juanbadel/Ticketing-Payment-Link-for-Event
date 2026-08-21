import Database from "better-sqlite3";

const db = new Database("tickets.db");

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    stripe_session_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    name TEXT,
    status TEXT NOT NULL DEFAULT 'valid', -- valid | used | cancelled
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    used_at TEXT
  );
`);

export function ticketExistsForSession(sessionId) {
  return db
    .prepare("SELECT 1 FROM tickets WHERE stripe_session_id = ?")
    .get(sessionId);
}

export function createTicket({ id, stripeSessionId, email, name }) {
  db.prepare(
    `INSERT INTO tickets (id, stripe_session_id, email, name) VALUES (?, ?, ?, ?)`
  ).run(id, stripeSessionId, email, name ?? null);
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
