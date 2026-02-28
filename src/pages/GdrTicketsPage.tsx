import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "../components/AppLayout";
import { supabase } from "../lib/supabase";
import type { Ticket, TicketStatus, TicketType } from "../types";
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
  const [filterStatus, setFilterStatus] = useState<TicketStatus | "">("");
  const [filterType, setFilterType] = useState<TicketType | "">("");
  const [filterUrgent, setFilterUrgent] = useState<boolean | "">("");
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

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

  const filteredAndSortedTickets = useMemo(() => {
    let list = tickets.filter((t) => {
      if (filterStatus && t.status !== filterStatus) return false;
      if (filterType && t.type !== filterType) return false;
      if (filterUrgent === true && !t.urgent) return false;
      if (filterUrgent === false && t.urgent) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      let va: string | number | boolean;
      let vb: string | number | boolean;
      switch (sortBy) {
        case "reference":
          va = a.reference;
          vb = b.reference;
          break;
        case "type":
          va = a.type;
          vb = b.type;
          break;
        case "status":
          va = a.status;
          vb = b.status;
          break;
        case "urgent":
          va = a.urgent ? 1 : 0;
          vb = b.urgent ? 1 : 0;
          break;
        case "urgent_reason":
          va = a.urgent_reason || "";
          vb = b.urgent_reason || "";
          break;
        case "demandeur":
          va = a.demandeur?.full_name?.trim() || a.demandeur?.email || "";
          vb = b.demandeur?.full_name?.trim() || b.demandeur?.email || "";
          break;
        case "created_at":
          va = a.created_at;
          vb = b.created_at;
          break;
        case "closed_at":
          va = a.closed_at || "";
          vb = b.closed_at || "";
          break;
        default:
          return 0;
      }
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortOrder === "asc" ? cmp : -cmp;
    });
    return list;
  }, [tickets, filterStatus, filterType, filterUrgent, sortBy, sortOrder]);

  const handleSort = (col: string) => {
    if (sortBy === col) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSortBy(col);
      setSortOrder(col === "created_at" || col === "closed_at" ? "desc" : "asc");
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-4 text-xl font-semibold text-slate-900 dark:text-slate-100">
          Tickets GDR
        </h1>
        {!loading && tickets.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 text-sm">
            <span className="font-medium text-slate-600 dark:text-slate-400">Filtres :</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus((e.target.value || "") as TicketStatus | "")}
              className="h-8 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 dark:text-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">Tous les statuts</option>
              <option value="envoye">Envoyé</option>
              <option value="recu">Reçu</option>
              <option value="en_cours">En cours</option>
              <option value="en_attente">En attente d&apos;infos</option>
              <option value="termine">Terminé</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType((e.target.value || "") as TicketType | "")}
              className="h-8 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 dark:text-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">Tous les types</option>
              <option value="creation">Création CODAG</option>
              <option value="enrichissement">Enrichissement</option>
              <option value="creation_enrichissement">Création + enrichissement</option>
            </select>
            <select
              value={filterUrgent === "" ? "" : filterUrgent ? "oui" : "non"}
              onChange={(e) => {
                const v = e.target.value;
                setFilterUrgent(v === "" ? "" : v === "oui");
              }}
              className="h-8 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 dark:text-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">Toutes urgences</option>
              <option value="oui">Urgents uniquement</option>
              <option value="non">Non urgents</option>
            </select>
            {(filterStatus || filterType || filterUrgent !== "") && (
              <button
                type="button"
                onClick={() => {
                  setFilterStatus("");
                  setFilterType("");
                  setFilterUrgent("");
                }}
                className="text-xs text-primary hover:underline"
              >
                Réinitialiser
              </button>
            )}
            <span className="text-slate-500 dark:text-slate-400">
              {filteredAndSortedTickets.length} ticket{filteredAndSortedTickets.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
        {loading ? (
          <div className="text-sm text-slate-600 dark:text-slate-400">Chargement des tickets...</div>
        ) : filteredAndSortedTickets.length === 0 ? (
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {tickets.length === 0 ? "Aucun ticket." : "Aucun ticket ne correspond aux filtres."}
          </div>
        ) : (
          <div className="overflow-x-auto overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  <th
                    className="cursor-pointer select-none px-4 py-2 text-left font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-600"
                    onClick={() => handleSort("reference")}
                  >
                    Référence {sortBy === "reference" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="cursor-pointer select-none px-4 py-2 text-left font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-600"
                    onClick={() => handleSort("type")}
                  >
                    Type {sortBy === "type" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="cursor-pointer select-none px-4 py-2 text-left font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-600"
                    onClick={() => handleSort("status")}
                  >
                    Statut {sortBy === "status" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="cursor-pointer select-none px-4 py-2 text-left font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-600"
                    onClick={() => handleSort("urgent")}
                  >
                    Urgence {sortBy === "urgent" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="cursor-pointer select-none px-4 py-2 text-left font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-600"
                    onClick={() => handleSort("urgent_reason")}
                  >
                    Motif urgence {sortBy === "urgent_reason" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="cursor-pointer select-none px-4 py-2 text-left font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-600"
                    onClick={() => handleSort("demandeur")}
                  >
                    Demandeur {sortBy === "demandeur" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="cursor-pointer select-none px-4 py-2 text-left font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-600"
                    onClick={() => handleSort("created_at")}
                  >
                    Créé le {sortBy === "created_at" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="cursor-pointer select-none px-4 py-2 text-left font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-600"
                    onClick={() => handleSort("closed_at")}
                  >
                    Clôturé le {sortBy === "closed_at" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedTickets.map((t) => (
                  <tr
                    key={t.id}
                    className={
                      t.urgent
                        ? "bg-red-50/60 dark:bg-red-900/30"
                        : "hover:bg-slate-50 dark:hover:bg-slate-700"
                    }
                  >
                    <td className="px-4 py-2 font-medium text-slate-900 dark:text-slate-100">
                      {t.reference}
                    </td>
                    <td className="px-4 py-2 text-slate-700 dark:text-slate-300">
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
                    <td className="max-w-[12rem] truncate px-4 py-2 text-slate-600 dark:text-slate-400">
                      {t.urgent_reason || "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">
                      {t.demandeur
                        ? t.demandeur.full_name?.trim() || t.demandeur.email
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">
                      {new Date(t.created_at).toLocaleString("fr-FR")}
                    </td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">
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
