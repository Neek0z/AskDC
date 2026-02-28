import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "../components/AppLayout";
import { supabase } from "../lib/supabase";
import type { ArticleLine, TicketType, TicketStatus } from "../types";

type TicketInfo = {
  id: number;
  reference: string;
  type: TicketType;
  status: TicketStatus;
  created_at: string;
};

type LineWithTicket = ArticleLine & {
  ticket?: TicketInfo | null;
  tickets?: TicketInfo | null; // parfois Supabase renvoie le nom de table
};

function typeLabel(type: TicketType) {
  switch (type) {
    case "creation":
      return "Création CODAG";
    case "enrichissement":
      return "Enrichissement";
    case "creation_enrichissement":
      return "Création + enrichissement";
  }
}

function statusLabel(status: TicketStatus) {
  switch (status) {
    case "envoye":
      return "Envoyé";
    case "recu":
      return "Reçu";
    case "en_cours":
      return "En cours";
    case "en_attente":
      return "En attente";
    case "termine":
      return "Terminé";
  }
}

export function LignesPage() {
  const [lines, setLines] = useState<LineWithTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("article_lines")
        .select("*, ticket:tickets(id, reference, type, status, created_at)")
        .order("ticket_id", { ascending: false })
        .order("id", { ascending: false });
      setLines((data as LineWithTicket[]) || []);
      setLoading(false);
    };
    void load();
  }, []);

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[1600px]">
        <h1 className="mb-4 text-xl font-semibold text-slate-900">
          Toutes les lignes des demandes
        </h1>
        {loading ? (
          <div className="text-sm text-slate-600">Chargement des lignes...</div>
        ) : lines.length === 0 ? (
          <div className="text-sm text-slate-600">Aucune ligne.</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="whitespace-nowrap px-1.5 py-0.5 text-left font-medium text-slate-600">
                    Réf. ticket
                  </th>
                  <th className="whitespace-nowrap px-1.5 py-0.5 text-left font-medium text-slate-600">
                    Type
                  </th>
                  <th className="whitespace-nowrap px-1.5 py-0.5 text-left font-medium text-slate-600">
                    Statut
                  </th>
                  <th className="whitespace-nowrap px-1.5 py-0.5 text-left font-medium text-slate-600">
                    Créé le
                  </th>
                  <th className="whitespace-nowrap px-1.5 py-0.5 text-left font-medium text-slate-600">
                    Id ligne
                  </th>
                  <th className="whitespace-nowrap px-1.5 py-0.5 text-left font-medium text-slate-600">
                    Nom fournisseur
                  </th>
                  <th className="whitespace-nowrap px-1.5 py-0.5 text-left font-medium text-slate-600">
                    Marque
                  </th>
                  <th className="whitespace-nowrap px-1.5 py-0.5 text-left font-medium text-slate-600">
                    Réf info
                  </th>
                  <th className="whitespace-nowrap px-1.5 py-0.5 text-left font-medium text-slate-600">
                    EAN
                  </th>
                  <th className="whitespace-nowrap px-1.5 py-0.5 text-left font-medium text-slate-600">
                    Ref com
                  </th>
                  <th className="whitespace-nowrap px-1.5 py-0.5 text-left font-medium text-slate-600">
                    Désignation
                  </th>
                  <th className="whitespace-nowrap px-1.5 py-0.5 text-left font-medium text-slate-600">
                    Tarif
                  </th>
                  <th className="whitespace-nowrap px-1.5 py-0.5 text-left font-medium text-slate-600">
                    CODAG attribué
                  </th>
                  <th className="whitespace-nowrap px-1.5 py-0.5" />
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => {
                  const ticket = l.ticket ?? l.tickets ?? null;
                  return (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-1.5 py-0.5 font-medium text-slate-900">
                      {ticket ? (
                        <Link
                          to={`/gdr/tickets/${ticket.id}`}
                          className="text-primary hover:underline"
                        >
                          {ticket.reference}
                        </Link>
                      ) : (
                        l.ticket_id
                      )}
                    </td>
                    <td className="whitespace-nowrap px-1.5 py-0.5 text-slate-600">
                      {ticket ? typeLabel(ticket.type) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-1.5 py-0.5 text-slate-600">
                      {ticket ? statusLabel(ticket.status) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-1.5 py-0.5 text-slate-600">
                      {ticket
                        ? new Date(ticket.created_at).toLocaleString("fr-FR")
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap px-1.5 py-0.5 text-slate-500">
                      {l.id}
                    </td>
                    <td className="px-1.5 py-0.5">{l.nom_fournisseur}</td>
                    <td className="px-1.5 py-0.5">{l.marque}</td>
                    <td className="px-1.5 py-0.5">{l.ref_info}</td>
                    <td className="px-1.5 py-0.5">{l.ean || "—"}</td>
                    <td className="px-1.5 py-0.5">{l.ref_com || "—"}</td>
                    <td className="max-w-[200px] truncate px-1.5 py-0.5" title={l.designation}>
                      {l.designation}
                    </td>
                    <td className="whitespace-nowrap px-1.5 py-0.5">
                      {l.tarif != null
                        ? (Math.round(Number(l.tarif) * 100) / 100)
                            .toFixed(2)
                            .replace(".", ",")
                        : "—"}
                    </td>
                    <td className="px-1.5 py-0.5">{l.codag_attribue || "—"}</td>
                    <td className="whitespace-nowrap px-1.5 py-0.5 text-right">
                      {ticket && (
                        <Link
                          to={`/gdr/tickets/${ticket.id}`}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Détail ticket
                        </Link>
                      )}
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
