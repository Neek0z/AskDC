import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "../components/AppLayout";
import { supabase } from "../lib/supabase";
import type { Ticket } from "../types";
import { Badge } from "../components/ui/badge";

type TicketWithRelations = Ticket & {
  demandeur?: { full_name: string | null; email: string } | null;
};

function statusLabel(status: Ticket["status"]) {
  switch (status) {
    case "envoye":
      return "Envoyé";
    case "recu":
      return "Reçu";
    case "en_cours":
      return "En cours";
    case "en_attente":
      return "En attente d'infos";
    case "termine":
      return "Terminé";
  }
}

function statusVariant(status: Ticket["status"]) {
  switch (status) {
    case "envoye":
      return "outline" as const;
    case "recu":
      return "default" as const;
    case "en_cours":
      return "info" as const;
    case "en_attente":
      return "warning" as const;
    case "termine":
      return "success" as const;
  }
}

export function GdrTicketsPage() {
  const [tickets, setTickets] = useState<TicketWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("tickets")
        .select("*, demandeur:profiles!demandeur_id(full_name, email)")
        .order("created_at", { ascending: false });
      setTickets((data as TicketWithRelations[]) || []);
      setLoading(false);
    };
    void load();
  }, []);

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-4 text-xl font-semibold text-slate-900">
          Tickets GDR
        </h1>
        {loading ? (
          <div className="text-sm text-slate-600">Chargement des tickets...</div>
        ) : tickets.length === 0 ? (
          <div className="text-sm text-slate-600">Aucun ticket.</div>
        ) : (
          <div className="overflow-x-auto overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">
                    Référence
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">
                    Type
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">
                    Statut
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">
                    Urgence
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">
                    Motif urgence
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">
                    Demandeur
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">
                    Créé le
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">
                    Clôturé le
                  </th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    className={
                      t.urgent ? "bg-red-50/60" : "hover:bg-slate-50"
                    }
                  >
                    <td className="px-4 py-2 font-medium text-slate-900">
                      {t.reference}
                    </td>
                    <td className="px-4 py-2 text-slate-700">
                      {t.type === "creation"
                        ? "Création CODAG"
                        : t.type === "enrichissement"
                          ? "Enrichissement"
                          : "Création CODAG + enrichissement"}
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant={statusVariant(t.status)}>
                        {statusLabel(t.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-2">
                      {t.urgent && <Badge variant="danger">Urgent</Badge>}
                    </td>
                    <td className="max-w-[12rem] truncate px-4 py-2 text-slate-600">
                      {t.urgent_reason || "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {t.demandeur
                        ? t.demandeur.full_name?.trim() || t.demandeur.email
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {new Date(t.created_at).toLocaleString("fr-FR")}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {t.closed_at
                        ? new Date(t.closed_at).toLocaleString("fr-FR")
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        to={`/gdr/tickets/${t.id}`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Détail
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
