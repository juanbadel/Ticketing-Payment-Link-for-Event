import { Router } from "express";
import express from "express";
import {
  findOldestPendingReservation,
  markReservationPaid,
} from "../db.js";
import { sendTicketForReservation } from "../services/ticket.js";

export const paypalIpnRouter = Router();

function ipnVerifyUrl() {
  return process.env.PAYPAL_ENV === "sandbox"
    ? "https://ipnpb.sandbox.paypal.com/cgi-bin/webscr"
    : "https://ipnpb.paypal.com/cgi-bin/webscr";
}

// PayPal (Notifications IPN) a besoin du corps brut, exactement tel que reçu,
// pour la vérification. On le monte AVANT express.json(), comme l'ancien
// webhook Stripe.
paypalIpnRouter.post(
  "/paypal-ipn",
  express.raw({ type: "application/x-www-form-urlencoded" }),
  async (req, res) => {
    // On répond tout de suite : PayPal réessaie si la réponse tarde.
    res.sendStatus(200);

    try {
      const rawBody = req.body.toString("utf-8");

      const verifyRes = await fetch(ipnVerifyUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `cmd=_notify-validate&${rawBody}`,
      });
      const verification = await verifyRes.text();

      if (verification !== "VERIFIED") {
        console.warn("IPN PayPal non vérifié:", verification);
        return;
      }

      const params = new URLSearchParams(rawBody);
      const paymentStatus = params.get("payment_status");

      if (paymentStatus !== "Completed") return;

      const receiverEmail = (
        params.get("receiver_email") || params.get("business") || ""
      ).toLowerCase();
      const expectedReceiver = (process.env.PAYPAL_RECEIVER_EMAIL || "").toLowerCase();

      if (expectedReceiver && receiverEmail !== expectedReceiver) {
        console.warn("IPN PayPal: destinataire inattendu", receiverEmail);
        return;
      }

      const currency = (params.get("mc_currency") || "").toLowerCase();
      const grossCents = Math.round(Number(params.get("mc_gross") || 0) * 100);

      const expectedAmountCents = Number(process.env.TICKET_AMOUNT_CENTS || 2000);
      const expectedCurrency = (process.env.TICKET_CURRENCY || "eur").toLowerCase();

      if (grossCents !== expectedAmountCents || currency !== expectedCurrency) {
        console.warn("IPN PayPal: montant inattendu", grossCents, currency);
        return;
      }

      const reservation = findOldestPendingReservation({
        amountCents: expectedAmountCents,
        currency: expectedCurrency,
      });

      if (!reservation) {
        console.error("IPN PayPal: paiement reçu sans réservation en attente correspondante");
        return;
      }

      // Idempotence : PayPal peut renvoyer la même notification plusieurs fois.
      const result = markReservationPaid(reservation.id);
      if (result.changes === 0) return;

      await sendTicketForReservation(reservation);
    } catch (err) {
      console.error("Erreur traitement IPN PayPal:", err);
    }
  }
);
