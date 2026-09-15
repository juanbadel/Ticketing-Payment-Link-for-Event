import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { reservationRouter } from "./routes/reservation.js";
import { verifyRouter } from "./routes/verify.js";
import { eventRouter } from "./routes/event.js";
import { adminRouter } from "./routes/admin.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(express.json());
app.use("/api", reservationRouter);
app.use("/api", verifyRouter);
app.use("/api", eventRouter);
app.use("/api", adminRouter);

// Sales page (event info + reservation form) and the admin confirmation page.
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/health", (req, res) => res.json({ ok: true }));

const port = process.env.PORT || 4242;
app.listen(port, () => {
  console.log(`Ticketing server running at http://localhost:${port}`);
});
