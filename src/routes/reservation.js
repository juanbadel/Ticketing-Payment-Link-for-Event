import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { createReservation } from "../db.js";

export const reservationRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Crée une réservation "en attente" puis renvoie le lien PayPal.me vers
// lequel rediriger l'acheteur. Le billet est envoyé automatiquement une fois
// le paiement confirmé par notification IPN (voir routes/paypalIpn.js).
reservationRouter.post("/create-reservation", (req, res) => {
  const { name, email } = req.body || {};

  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "Invalid email" });
  }

  const paypalUsername = process.env.PAYPAL_ME_USERNAME;
  if (!paypalUsername) {
    console.error("PAYPAL_ME_USERNAME is missing in .env");
    return res.status(500).json({ error: "Payment unavailable right now" });
  }

  const amountCents = Number(process.env.TICKET_AMOUNT_CENTS || 2000);
  const currency = (process.env.TICKET_CURRENCY || "eur").toLowerCase();

  const id = uuidv4();
  createReservation({ id, email, name, amountCents, currency });

  const amount = (amountCents / 100).toFixed(2);
  const paypalUrl = `https://paypal.me/${paypalUsername}/${amount}${currency.toUpperCase()}`;

  res.json({ paypalUrl });
});
