import { Router } from "express";
import { listPendingReservations, getTicket, markReservationPaid } from "../db.js";
import { sendTicketForReservation } from "../services/ticket.js";

export const adminRouter = Router();

function requireStaffKey(req, res, next) {
  const key = req.headers["x-staff-key"];
  if (!key || key !== process.env.STAFF_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// Utilisé par public/admin.html : liste des réservations en attente d'un
// paiement PayPal que l'organisateur doit vérifier et confirmer lui-même.
adminRouter.get("/admin/reservations", requireStaffKey, (req, res) => {
  res.json(listPendingReservations());
});

// Confirme manuellement qu'un paiement a été reçu sur le compte PayPal :
// marque la réservation comme payée et envoie le billet (QR code) à l'acheteur.
adminRouter.post("/admin/reservations/:id/confirm", requireStaffKey, async (req, res) => {
  const { id } = req.params;
  const reservation = getTicket(id);

  if (!reservation || reservation.status !== "pending") {
    return res.status(404).json({ error: "No matching pending reservation" });
  }

  const result = markReservationPaid(id);
  if (result.changes === 0) {
    return res.status(409).json({ error: "Already confirmed" });
  }

  await sendTicketForReservation(reservation);
  res.json({ ok: true });
});
