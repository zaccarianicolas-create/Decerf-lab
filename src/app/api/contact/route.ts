import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // Anti-spam : 5 messages / heure / IP
  const rl = await rateLimit(request, {
    key: "contact",
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) return rl.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  }

  const nom = String(body.nom || "").trim();
  const email = String(body.email || "").trim();
  const telephone = body.telephone ? String(body.telephone).trim() : null;
  const sujet = body.sujet ? String(body.sujet).trim() : null;
  const message = String(body.message || "").trim();
  const website = body.website ? String(body.website).trim() : "";

  if (website) {
    return NextResponse.json({ success: true });
  }

  if (!nom || !email || !message) {
    return NextResponse.json(
      { error: "nom, email et message requis" },
      { status: 400 }
    );
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Email invalide" }, { status: 400 });
  }
  if (message.length < 10) {
    return NextResponse.json(
      { error: "Message trop court (10 caractères min.)" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const userAgent = request.headers.get("user-agent") || null;

  await admin.from("contact_messages").insert({
    nom,
    email,
    telephone,
    sujet,
    message,
    ip,
    user_agent: userAgent,
  });

  const to =
    process.env.CONTACT_INBOX_EMAIL ||
    process.env.EMAIL_FROM?.match(/<(.+)>/)?.[1] ||
    "contact@decerf-lab.be";

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:600px">
      <h2 style="color:#0284c7">Nouveau message de contact</h2>
      <table style="border-collapse:collapse;width:100%">
        <tr><td style="padding:6px 0;color:#64748b">Nom</td><td><strong>${escapeHtml(nom)}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Email</td><td><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
        ${telephone ? `<tr><td style="padding:6px 0;color:#64748b">Téléphone</td><td>${escapeHtml(telephone)}</td></tr>` : ""}
        ${sujet ? `<tr><td style="padding:6px 0;color:#64748b">Sujet</td><td>${escapeHtml(sujet)}</td></tr>` : ""}
      </table>
      <hr style="margin:16px 0;border:none;border-top:1px solid #e2e8f0" />
      <p style="white-space:pre-wrap;line-height:1.5">${escapeHtml(message)}</p>
      <hr style="margin:16px 0;border:none;border-top:1px solid #e2e8f0" />
      <p style="color:#94a3b8;font-size:12px">IP: ${escapeHtml(ip)}</p>
    </div>
  `;

  await sendEmail({
    to,
    template: "nouveau_message",
    subject: `[Contact] ${sujet || "Nouveau message de " + nom}`,
    html,
    text: `${nom} <${email}>\n${telephone ? "Tel: " + telephone + "\n" : ""}${sujet ? "Sujet: " + sujet + "\n" : ""}\n${message}`,
    payload: { nom, email, sujet },
  });

  return NextResponse.json({ success: true });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
