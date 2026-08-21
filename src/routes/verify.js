import { Router } from "express";
import { getTicket, markTicketUsed } from "../db.js";

export const verifyRouter = Router();

function requireStaffKey(req, res, next) {
  const key = req.headers["x-staff-key"];
  if (!key || key !== process.env.STAFF_API_KEY) {
    return res.status(401).json({ error: "Non autorisé" });
  }
  next();
}

// Utilisé par l'appli / page de scan à l'entrée de l'événement.
verifyRouter.post("/verify-ticket", requireStaffKey, (req, res) => {
  const { ticketId } = req.body;

  if (!ticketId) {
    return res.status(400).json({ error: "ticketId manquant" });
  }

  const ticket = getTicket(ticketId);

  if (!ticket) {
    return res.status(404).json({ valid: false, reason: "Billet inconnu" });
  }

  if (ticket.status === "used") {
    return res.status(409).json({
      valid: false,
      reason: "Billet déjà scanné",
      used_at: ticket.used_at,
    });
  }

  if (ticket.status !== "valid") {
    return res.status(409).json({ valid: false, reason: `Statut: ${ticket.status}` });
  }

  markTicketUsed(ticketId);

  res.json({ valid: true, name: ticket.name, email: ticket.email });
});
