import { Router } from "express";

export const eventRouter = Router();

// Utilisé par la page de vente (public/index.html) pour afficher les infos
// de l'événement sans les coder en dur dans le HTML.
eventRouter.get("/event", (req, res) => {
  res.json({
    name: process.env.EVENT_NAME || "Mon Événement",
    date: process.env.EVENT_DATE || "",
    location: process.env.EVENT_LOCATION || "",
    description: process.env.EVENT_DESCRIPTION || "",
    includes: process.env.EVENT_INCLUDES || "",
    priceCents: Number(process.env.TICKET_AMOUNT_CENTS || 2000),
    currency: process.env.TICKET_CURRENCY || "eur",
  });
});
