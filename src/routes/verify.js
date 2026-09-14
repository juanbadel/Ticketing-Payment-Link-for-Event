import { Router } from "express";
import { getTicket, markTicketUsed } from "../db.js";

export const verifyRouter = Router();

function requireStaffKey(req, res, next) {
  const key = req.headers["x-staff-key"];
  if (!key || key !== process.env.STAFF_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// Used by the staff app / scanning page at the event entrance.
verifyRouter.post("/verify-ticket", requireStaffKey, (req, res) => {
  const { ticketId } = req.body;

  if (!ticketId) {
    return res.status(400).json({ error: "Missing ticketId" });
  }

  const ticket = getTicket(ticketId);

  if (!ticket) {
    return res.status(404).json({ valid: false, reason: "Unknown ticket" });
  }

  if (ticket.status === "used") {
    return res.status(409).json({
      valid: false,
      reason: "Ticket already scanned",
      used_at: ticket.used_at,
    });
  }

  if (ticket.status !== "valid") {
    return res.status(409).json({ valid: false, reason: `Status: ${ticket.status}` });
  }

  markTicketUsed(ticketId);

  res.json({ valid: true, name: ticket.name, email: ticket.email });
});
