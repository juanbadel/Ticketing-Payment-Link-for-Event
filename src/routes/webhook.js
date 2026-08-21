import { Router } from "express";
import express from "express";
import { stripe } from "../stripe.js";
import { issueTicketFromSession } from "../services/ticket.js";

export const webhookRouter = Router();

// IMPORTANT : Stripe doit recevoir le corps brut (non parsé en JSON) pour
// pouvoir vérifier la signature. Ce middleware raw doit être utilisé
// uniquement sur cette route, avant tout express.json() global.
webhookRouter.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Signature webhook invalide:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        await issueTicketFromSession(session);
      }
      res.json({ received: true });
    } catch (err) {
      console.error("Erreur traitement webhook:", err);
      // 500 => Stripe réessaiera l'envoi de l'événement plus tard
      res.status(500).json({ error: "Erreur interne" });
    }
  }
);
