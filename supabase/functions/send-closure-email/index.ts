// Edge Function: envoie un email au demandeur quand un ticket est clôturé.
// Déployer avec: supabase functions deploy send-closure-email
// Secrets à définir: RESEND_API_KEY (optionnel: RESEND_FROM, défaut onboarding@resend.dev)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "CODAG Request <onboarding@resend.dev>";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface RequestBody {
  ticket_id: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors() });
  }

  try {
    const body = (await req.json()) as RequestBody;
    const ticketId = body?.ticket_id;
    if (typeof ticketId !== "number" || ticketId <= 0) {
      return json({ error: "ticket_id requis (nombre)" }, 400);
    }

    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY non configuré, email de clôture ignoré.");
      return json({ ok: true, skipped: "no_resend_key" }, 200);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select("id, reference, demandeur_id")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      return json({ error: "Ticket introuvable" }, 404);
    }

    const demandeurId = (ticket as { demandeur_id: string }).demandeur_id;
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", demandeurId)
      .single();

    const toEmail = (profile as { email: string } | null)?.email;
    if (!toEmail) {
      return json({ error: "Email demandeur introuvable" }, 400);
    }

    const reference = (ticket as { reference: string }).reference;
    const subject = `Ticket ${reference} clôturé – CODAG Request Manager`;
    const html = `
      <p>Bonjour,</p>
      <p>Votre ticket <strong>${reference}</strong> a été clôturé.</p>
      <p>Vous pouvez consulter le détail depuis l’application CODAG Request Manager.</p>
      <p>Cordialement,<br/>L’équipe CODAG</p>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: toEmail,
        subject,
        html,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("Resend error", data);
      return json({ error: "Envoi email échoué", details: data }, 502);
    }

    return json({ ok: true, message_id: data?.id }, 200);
  } catch (err) {
    console.error("send-closure-email", err);
    return json({ error: String(err) }, 500);
  }
};

function json(body: object, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors() },
  });
}

function cors(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

Deno.serve(handler);
