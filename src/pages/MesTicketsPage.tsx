import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import type { Ticket } from "../types";

type TicketWithGdr = Ticket & {
  gdr?: { full_name: string | null; email: string } | null;
};
import { AppLayout } from "../components/AppLayout";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";

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

export function MesTicketsPage() {
  const { userId } = useAuth();
  const [tickets, setTickets] = useState<TicketWithGdr[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("tickets")
        .select("*, gdr:profiles!gdr_id(full_name, email)")
        .eq("demandeur_id", userId)
        .order("created_at", { ascending: false });
      setTickets((data as TicketWithGdr[]) || []);
      setLoading(false);
    };
    void load();
  }, [userId]);

  const canDelete = (t: TicketWithGdr) => t.status === "envoye";

  const deleteTicket = async (id: number) => {
    if (!userId) return;
    if (!window.confirm("Voulez-vous vraiment supprimer ce ticket ?")) return;
    setDeletingId(id);
    await supabase
      .from("tickets")
      .delete()
      .eq("id", id)
      .eq("demandeur_id", userId)
      .eq("status", "envoye");

    setTickets((prev) => prev.filter((t) => t.id !== id));
    setDeletingId(null);
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl">
      {loading ? (
        <div className="text-sm text-slate-600 dark:text-slate-400">Chargement de vos tickets...</div>
      ) : tickets.length === 0 ? (
        <div className="text-sm text-slate-600 dark:text-slate-400">
          Aucun ticket pour le moment. Créez votre première demande.
        </div>
      ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400 dark:text-slate-300">Référence</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400 dark:text-slate-300">Type</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400 dark:text-slate-300">Statut</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400 dark:text-slate-300">Urgence</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400 dark:text-slate-300">GDR</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400 dark:text-slate-300">
                    Créé le
                  </th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    className={t.urgent ? "bg-red-50/60" : "hover:bg-slate-50 dark:hover:bg-slate-700"}
                  >
                    <td className="px-4 py-2 text-slate-900 dark:text-slate-100">{t.reference}</td>
                    <td className="px-4 py-2 text-slate-700 dark:text-slate-300">
                      {t.type === "creation"
                        ? "Création CODAG"
                        : t.type === "enrichissement"
                        ? "Enrichissement"
                        : "Création CODAG + enrichissement"}
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant={statusVariant(t.status)}>{statusLabel(t.status)}</Badge>
                    </td>
                    <td className="px-4 py-2">
                      {t.urgent && <Badge variant="danger">Urgent</Badge>}
                    </td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">
                      {t.gdr
                        ? t.gdr.full_name?.trim() || t.gdr.email
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">
                      {new Date(t.created_at).toLocaleString("fr-FR")}
                    </td>
                    <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        to={`/mes-tickets/${t.id}`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Détail
                      </Link>
                      {canDelete(t) && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="px-2 text-xs text-red-600"
                          disabled={deletingId === t.id}
                          onClick={() => void deleteTicket(t.id)}
                        >
                          Supprimer
                        </Button>
                      )}
                    </div>
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

