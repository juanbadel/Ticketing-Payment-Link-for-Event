import { Router } from "express";
import { stripe } from "../stripe.js";

export const checkoutRouter = Router();

checkoutRouter.post("/create-checkout-session", async (req, res) => {
  try {
    const lineItem = process.env.STRIPE_PRICE_ID
      ? { price: process.env.STRIPE_PRICE_ID, quantity: 1 }
      : {
          quantity: 1,
          price_data: {
            currency: process.env.TICKET_CURRENCY || "eur",
            unit_amount: Number(process.env.TICKET_AMOUNT_CENTS || 2000),
            product_data: { name: process.env.EVENT_NAME || "Billet événement" },
          },
        };

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [lineItem],
      success_url: process.env.SUCCESS_URL,
      cancel_url: process.env.CANCEL_URL,
      // Nécessaire pour récupérer l'email de l'acheteur dans le webhook
      customer_creation: "always",
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Erreur création session Checkout:", err);
    res.status(500).json({ error: "Impossible de créer la session de paiement" });
  }
});
