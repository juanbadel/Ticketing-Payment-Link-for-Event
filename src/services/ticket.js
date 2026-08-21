import { v4 as uuidv4 } from "uuid";
import { createTicket, ticketExistsForSession } from "../db.js";
import { generateTicketQrPng } from "./qrcode.js";
import { sendTicketEmail } from "./email.js";

export async function issueTicketFromSession(session) {
  // Idempotence : Stripe peut renvoyer le même événement webhook plusieurs fois.
  if (ticketExistsForSession(session.id)) {
    return;
  }

  const email = session.customer_details?.email;
  const name = session.customer_details?.name;

  if (!email) {
    throw new Error(`Session ${session.id} n'a pas d'email client`);
  }

  const ticketId = uuidv4();

  createTicket({
    id: ticketId,
    stripeSessionId: session.id,
    email,
    name,
  });

  const qrPngBuffer = await generateTicketQrPng(ticketId);

  await sendTicketEmail({ to: email, name, ticketId, qrPngBuffer });
}
