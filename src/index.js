import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { paypalIpnRouter } from "./routes/paypalIpn.js";
import { reservationRouter } from "./routes/reservation.js";
import { verifyRouter } from "./routes/verify.js";
import { eventRouter } from "./routes/event.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// L'IPN PayPal a besoin du corps brut : on le monte AVANT express.json().
app.use("/api", paypalIpnRouter);

app.use(express.json());
app.use("/api", reservationRouter);
app.use("/api", verifyRouter);
app.use("/api", eventRouter);

// Page de vente (infos événement + formulaire de réservation).
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/health", (req, res) => res.json({ ok: true }));

const port = process.env.PORT || 4242;
app.listen(port, () => {
  console.log(`Serveur billetterie démarré sur http://localhost:${port}`);
});
