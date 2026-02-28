import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AppLayout } from "../components/AppLayout";
import { supabase } from "../lib/supabase";
import type { ArticleLine, Comment, Ticket, TicketStatus } from "../types";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

interface TicketWithLines extends Ticket {
  article_lines: ArticleLine[];
  comments: Comment[];
}

export function GdrTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<TicketWithLines | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<TicketStatus>("recu");
  const [closingNote, setClosingNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("tickets")
        .select("*, article_lines (*), comments (*)")
        .eq("id", Number(id))
        .single();
      if (data) {
        const t = data as TicketWithLines;
        setTicket(t);
        setStatus(t.status);
      }
      setLoading(false);
    };
    void load();
  }, [id]);

  const updateCodag = (lineId: number, value: string) => {
    if (!ticket) return;
    setTicket({
      ...ticket,
      article_lines: ticket.article_lines.map((l) =>
        l.id === lineId ? { ...l, codag_attribue: value } : l
      )
    });
  };

  const saveChanges = async () => {
    if (!ticket) return;
    setSaving(true);
    try {
      await supabase
        .from("tickets")
        .update({
          status,
          closed_at: status === "termine" ? new Date().toISOString() : null
        })
        .eq("id", ticket.id);

      for (const line of ticket.article_lines) {
        await supabase
          .from("article_lines")
          .update({ codag_attribue: line.codag_attribue })
          .eq("id", line.id);
      }

      if (status === "termine" && closingNote) {
        await supabase.from("comments").insert({
          ticket_id: ticket.id,
          author_id: ticket.gdr_id,
          content: closingNote
        });
      }

      if (status === "termine") {
        void supabase.functions.invoke("send-closure-email", {
          body: { ticket_id: ticket.id }
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      {loading || !ticket ? (
        <div className="text-sm text-slate-600">Chargement du ticket...</div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">
                Ticket {ticket.reference}
              </h1>
              <p className="text-sm text-slate-600">
                {ticket.type === "creation"
                  ? "Création CODAG"
                  : ticket.type === "enrichissement"
                  ? "Enrichissement"
                  : "Création CODAG + enrichissement"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {ticket.urgent && <Badge variant="danger">Urgent</Badge>}
              <select
                className="h-9 rounded-md border border-input bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={status}
                onChange={(e) => setStatus(e.target.value as TicketStatus)}
              >
                {/* Le GDR ne revient pas à "envoye" */}
                <option value="recu">Reçu</option>
                <option value="en_cours">En cours</option>
                <option value="en_attente">En attente d&apos;infos</option>
                <option value="termine">Terminé</option>
              </select>
            </div>
          </div>

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-800">
              Lignes article (CODAG)
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs md:text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-1 py-0.5 text-left font-medium text-slate-600">
                      Nom fournisseur
                    </th>
                    <th className="px-1 py-0.5 text-left font-medium text-slate-600">
                      Marque
                    </th>
                    <th className="px-1 py-0.5 text-left font-medium text-slate-600">
                      Réf info
                    </th>
                    <th className="px-1 py-0.5 text-left font-medium text-slate-600">
                      EAN
                    </th>
                    <th className="px-1 py-0.5 text-left font-medium text-slate-600">
                      Ref com
                    </th>
                    <th className="px-1 py-0.5 text-left font-medium text-slate-600">
                      Désignation
                    </th>
                    <th className="px-1 py-0.5 text-left font-medium text-slate-600">
                      Tarif
                    </th>
                    {(ticket.type === "creation" ||
                      ticket.type === "creation_enrichissement") && (
                      <th className="px-1 py-0.5 text-left font-medium text-slate-600">
                        CODAG attribué
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {ticket.article_lines.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="px-1 py-0.5">{l.nom_fournisseur}</td>
                      <td className="px-1 py-0.5">{l.marque}</td>
                      <td className="px-1 py-0.5">{l.ref_info}</td>
                      <td className="px-1 py-0.5">{l.ean || "—"}</td>
                      <td className="px-1 py-0.5">{l.ref_com || "—"}</td>
                      <td className="px-1 py-0.5">{l.designation}</td>
                      <td className="px-1 py-0.5">
                        {l.tarif != null
                          ? (Math.round(Number(l.tarif) * 100) / 100)
                              .toFixed(2)
                              .replace(".", ",")
                          : "—"}
                      </td>
                      {(ticket.type === "creation" ||
                        ticket.type === "creation_enrichissement") && (
                        <td className="px-1 py-0.5">
                          <Input
                            value={l.codag_attribue ?? ""}
                            onChange={(e) => updateCodag(l.id, e.target.value)}
                            placeholder="CODAG"
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {(ticket.type === "enrichissement" ||
            ticket.type === "creation_enrichissement") && (
            <section className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold text-slate-800">
                Note de clôture (enrichissement)
              </h2>
              <textarea
                className="min-h-[80px] w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={closingNote}
                onChange={(e) => setClosingNote(e.target.value)}
                placeholder="Résumé des modifications apportées..."
              />
            </section>
          )}

          <div className="flex justify-end">
            <Button onClick={() => void saveChanges()} disabled={saving}>
              {saving ? "Enregistrement..." : "Enregistrer les changements"}
            </Button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

