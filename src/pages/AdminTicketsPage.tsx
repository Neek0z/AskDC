import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "../components/AppLayout";
import { supabase } from "../lib/supabase";
import type { Ticket } from "../types";
import { Badge } from "../components/ui/badge";

export function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("tickets")
        .select("*")
        .order("created_at", { ascending: false });
      setTickets((data as Ticket[]) || []);
      setLoading(false);
    };
    void load();
  }, []);

  return (
    <AppLayout>
      <h1 className="mb-4 text-xl font-semibold text-slate-900">
        Tous les tickets
      </h1>
      {loading ? (
        <div className="text-sm text-slate-600">Chargement des tickets...</div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Référence</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Type</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Statut</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Urgent</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Créé le</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr
                  key={t.id}
                  className={t.urgent ? "bg-red-50/60" : "hover:bg-slate-50"}
                >
                  <td className="px-4 py-2 text-slate-900">{t.reference}</td>
                  <td className="px-4 py-2 text-slate-700">
                    {t.type === "creation"
                      ? "Création CODAG"
                      : t.type === "enrichissement"
                      ? "Enrichissement"
                      : "Création CODAG + enrichissement"}
                  </td>
                  <td className="px-4 py-2">
                    <Badge>
                      {t.status === "envoye"
                        ? "Envoyé"
                        : t.status === "recu"
                        ? "Reçu"
                        : t.status === "en_cours"
                        ? "En cours"
                        : t.status === "en_attente"
                        ? "En attente d'infos"
                        : "Terminé"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">
                    {t.urgent && <Badge variant="danger">Urgent</Badge>}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {new Date(t.created_at).toLocaleString("fr-FR")}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      to={`/gdr/tickets/${t.id}`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Ouvrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
}

