import { generateTicketQrPng } from "./qrcode.js";
import { sendTicketEmail } from "./email.js";

export async function sendTicketForReservation(reservation) {
  const qrPngBuffer = await generateTicketQrPng(reservation.id);

  await sendTicketEmail({
    to: reservation.email,
    name: reservation.name,
    ticketId: reservation.id,
    qrPngBuffer,
  });
}
