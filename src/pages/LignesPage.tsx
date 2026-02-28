import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "../components/AppLayout";
import { supabase } from "../lib/supabase";
import type { ArticleLine, TicketType, TicketStatus } from "../types";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";

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

function statusVariant(status: TicketStatus) {
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

export function LignesPage() {
  const [lines, setLines] = useState<LineWithTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<TicketType | "">("");
  const [filterStatus, setFilterStatus] = useState<TicketStatus | "">("");
  const [sortBy, setSortBy] = useState<string>("ticket_created");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [commentLineId, setCommentLineId] = useState<number | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [savingComment, setSavingComment] = useState(false);

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

  const getTicket = (l: LineWithTicket) => l.ticket ?? l.tickets ?? null;

  const filteredAndSortedLines = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = lines.filter((l) => {
      const ticket = getTicket(l);
      if (filterType && (!ticket || ticket.type !== filterType)) return false;
      if (filterStatus && (!ticket || ticket.status !== filterStatus)) return false;
      if (q) {
        const ref = ticket?.reference ?? "";
        const parts = [
          ref,
          l.nom_fournisseur,
          l.marque,
          l.ref_info,
          l.ean ?? "",
          l.ref_com ?? "",
          l.designation,
          l.codag_attribue ?? "",
          l.comment ?? "",
        ];
        const matches = parts.some((p) => String(p).toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      const tA = getTicket(a);
      const tB = getTicket(b);
      let va: string | number;
      let vb: string | number;
      switch (sortBy) {
        case "ticket_ref":
          va = tA?.reference ?? "";
          vb = tB?.reference ?? "";
          break;
        case "type":
          va = tA?.type ?? "";
          vb = tB?.type ?? "";
          break;
        case "status":
          va = tA?.status ?? "";
          vb = tB?.status ?? "";
          break;
        case "ticket_created":
          va = tA?.created_at ?? "";
          vb = tB?.created_at ?? "";
          break;
        case "id":
          va = a.id;
          vb = b.id;
          break;
        case "nom_fournisseur":
          va = a.nom_fournisseur;
          vb = b.nom_fournisseur;
          break;
        case "marque":
          va = a.marque;
          vb = b.marque;
          break;
        case "ref_info":
          va = a.ref_info;
          vb = b.ref_info;
          break;
        case "ean":
          va = a.ean ?? "";
          vb = b.ean ?? "";
          break;
        case "ref_com":
          va = a.ref_com ?? "";
          vb = b.ref_com ?? "";
          break;
        case "designation":
          va = a.designation;
          vb = b.designation;
          break;
        case "tarif":
          va = a.tarif ?? -Infinity;
          vb = b.tarif ?? -Infinity;
          break;
        case "codag_attribue":
          va = a.codag_attribue ?? "";
          vb = b.codag_attribue ?? "";
          break;
        default:
          return 0;
      }
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortOrder === "asc" ? cmp : -cmp;
    });
    return list;
  }, [lines, filterType, filterStatus, sortBy, sortOrder, searchQuery]);

  const handleSort = (col: string) => {
    if (sortBy === col) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSortBy(col);
      setSortOrder(col === "ticket_created" || col === "id" ? "desc" : "asc");
    }
  };

  const openCommentModal = (line: LineWithTicket) => {
    setCommentLineId(line.id);
    setCommentDraft(line.comment ?? "");
  };

  const closeCommentModal = () => {
    setCommentLineId(null);
    setCommentDraft("");
  };

  const saveComment = async () => {
    if (commentLineId == null) return;
    setSavingComment(true);
    const { error } = await supabase
      .from("article_lines")
      .update({ comment: commentDraft || null })
      .eq("id", commentLineId);
    setSavingComment(false);
    if (error) {
      console.error("Erreur sauvegarde commentaire:", error);
      return;
    }
    setLines((prev) =>
      prev.map((l) => (l.id === commentLineId ? { ...l, comment: commentDraft || null } : l))
    );
    closeCommentModal();
  };

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[1600px]">
        <h1 className="mb-4 text-xl font-semibold text-slate-900 dark:text-slate-100">
          Toutes les lignes des demandes
        </h1>
        {!loading && lines.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex flex-1 min-w-[200px] max-w-xs items-center gap-2">
              <span className="font-medium text-slate-600 dark:text-slate-300 shrink-0">Recherche :</span>
              <Input
                type="search"
                placeholder="Réf., fournisseur, désignation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <span className="font-medium text-slate-600 dark:text-slate-300">Filtres :</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType((e.target.value || "") as TicketType | "")}
              className="h-8 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            >
              <option value="">Tous les types</option>
              <option value="creation">Création CODAG</option>
              <option value="enrichissement">Enrichissement</option>
              <option value="creation_enrichissement">Création + enrichissement</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus((e.target.value || "") as TicketStatus | "")}
              className="h-8 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            >
              <option value="">Tous les statuts</option>
              <option value="envoye">Envoyé</option>
              <option value="recu">Reçu</option>
              <option value="en_cours">En cours</option>
              <option value="en_attente">En attente d&apos;infos</option>
              <option value="termine">Terminé</option>
            </select>
            {(filterType || filterStatus) && (
              <button
                type="button"
                onClick={() => {
                  setFilterType("");
                  setFilterStatus("");
                }}
                className="text-xs text-primary hover:underline"
              >
                Réinitialiser
              </button>
            )}
            <span className="text-slate-500 dark:text-slate-400">
              {filteredAndSortedLines.length} ligne{filteredAndSortedLines.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
        {loading ? (
          <div className="text-sm text-slate-600 dark:text-slate-400">Chargement des lignes...</div>
        ) : filteredAndSortedLines.length === 0 ? (
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {lines.length === 0 ? "Aucune ligne." : "Aucune ligne ne correspond aux filtres."}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <table className="min-w-full text-sm table-auto">
              <thead className="bg-slate-100 dark:bg-slate-700">
                <tr>
                  <th
                    className="cursor-pointer select-none whitespace-nowrap px-3 py-0.5 text-left font-medium text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-600"
                    onClick={() => handleSort("ticket_ref")}
                  >
                    Réf. ticket {sortBy === "ticket_ref" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="cursor-pointer select-none whitespace-nowrap px-3 py-0.5 text-left font-medium text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-600"
                    onClick={() => handleSort("type")}
                  >
                    Type {sortBy === "type" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="cursor-pointer select-none whitespace-nowrap px-3 py-0.5 text-left font-medium text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-600"
                    onClick={() => handleSort("status")}
                  >
                    Statut {sortBy === "status" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="cursor-pointer select-none whitespace-nowrap px-3 py-0.5 text-left font-medium text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-600"
                    onClick={() => handleSort("ticket_created")}
                  >
                    Créé le {sortBy === "ticket_created" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="cursor-pointer select-none whitespace-nowrap px-3 py-0.5 text-left font-medium text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-600"
                    onClick={() => handleSort("id")}
                  >
                    Id ligne {sortBy === "id" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="cursor-pointer select-none whitespace-nowrap px-3 py-0.5 text-left font-medium text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-600"
                    onClick={() => handleSort("nom_fournisseur")}
                  >
                    Nom fournisseur {sortBy === "nom_fournisseur" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="cursor-pointer select-none whitespace-nowrap px-3 py-0.5 text-left font-medium text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-600"
                    onClick={() => handleSort("marque")}
                  >
                    Marque {sortBy === "marque" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="cursor-pointer select-none whitespace-nowrap px-3 py-0.5 text-left font-medium text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-600"
                    onClick={() => handleSort("ref_info")}
                  >
                    Réf info {sortBy === "ref_info" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="cursor-pointer select-none whitespace-nowrap px-3 py-0.5 text-left font-medium text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-600"
                    onClick={() => handleSort("ean")}
                  >
                    EAN {sortBy === "ean" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="cursor-pointer select-none whitespace-nowrap px-3 py-0.5 text-left font-medium text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-600"
                    onClick={() => handleSort("ref_com")}
                  >
                    Ref com {sortBy === "ref_com" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="cursor-pointer select-none whitespace-nowrap px-3 py-0.5 text-left font-medium text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-600"
                    onClick={() => handleSort("designation")}
                  >
                    Désignation {sortBy === "designation" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="cursor-pointer select-none whitespace-nowrap px-3 py-0.5 text-left font-medium text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-600"
                    onClick={() => handleSort("tarif")}
                  >
                    Tarif {sortBy === "tarif" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="cursor-pointer select-none whitespace-nowrap px-3 py-0.5 text-left font-medium text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-600"
                    onClick={() => handleSort("codag_attribue")}
                  >
                    CODAG attribué {sortBy === "codag_attribue" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="whitespace-nowrap px-3 py-0.5 text-left font-medium text-slate-700 dark:text-slate-300">
                    Commentaire
                  </th>
                  <th className="whitespace-nowrap px-3 py-0.5" />
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedLines.map((l) => {
                  const ticket = l.ticket ?? l.tickets ?? null;
                  return (
                  <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="whitespace-nowrap px-3 py-0.5 font-medium text-slate-900 dark:text-slate-100">
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
                    <td className="whitespace-nowrap px-3 py-0.5">
                      {ticket ? (
                        <span className="text-slate-700 dark:text-slate-300">
                          {typeLabel(ticket.type)}
                        </span>
                      ) : (
                        ""
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-0.5">
                      {ticket ? (
                        <Badge variant={statusVariant(ticket.status)}>
                          {statusLabel(ticket.status)}
                        </Badge>
                      ) : (
                        ""
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-0.5 text-slate-600 dark:text-slate-400">
                      {ticket
                        ? new Date(ticket.created_at).toLocaleString("fr-FR")
                        : ""}
                    </td>
                    <td className="whitespace-nowrap px-3 py-0.5 text-slate-500 dark:text-slate-400">
                      {l.id}
                    </td>
                    <td className="px-3 py-0.5 text-slate-800 dark:text-slate-200">
                      {l.nom_fournisseur}
                    </td>
                    <td className="px-3 py-0.5 text-slate-700 dark:text-slate-300">
                      {l.marque}
                    </td>
                    <td className="px-3 py-0.5 text-slate-700 dark:text-slate-300">
                      {l.ref_info}
                    </td>
                    <td className="px-3 py-0.5 text-slate-600 dark:text-slate-400">
                      {l.ean || ""}
                    </td>
                    <td className="px-3 py-0.5 text-slate-600 dark:text-slate-400">
                      {l.ref_com || ""}
                    </td>
                    <td
                      className="max-w-[200px] truncate px-3 py-0.5 text-slate-700 dark:text-slate-300"
                      title={l.designation}
                    >
                      {l.designation}
                    </td>
                    <td className="whitespace-nowrap px-3 py-0.5 font-medium text-slate-700 dark:text-slate-300">
                      {l.tarif != null
                        ? (Math.round(Number(l.tarif) * 100) / 100)
                            .toFixed(2)
                            .replace(".", ",")
                        : ""}
                    </td>
                    <td className="overflow-hidden text-ellipsis px-3 py-0.5 text-slate-700 dark:text-slate-300">
                      {l.codag_attribue || ""}
                    </td>
                    <td className="overflow-hidden text-ellipsis px-3 py-0.5">
                      <button
                        type="button"
                        onClick={() => openCommentModal(l)}
                        className="inline-flex items-center gap-1 rounded px-3 py-0.5 text-xs text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-600"
                        title={l.comment || "Ajouter un commentaire"}
                      >
                        <span className="text-base" aria-hidden>💬</span>
                        {l.comment && (
                          <span className="max-w-[60px] truncate" title={l.comment}>
                            {l.comment}
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="whitespace-nowrap overflow-hidden text-ellipsis px-3 py-0.5 text-right">
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

        {/* Modal commentaire */}
        {commentLineId != null && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={closeCommentModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="comment-modal-title"
          >
            <div
              className="mx-4 w-full max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="comment-modal-title" className="mb-3 text-sm font-medium text-slate-900 dark:text-slate-100">
                Commentaire pour la ligne #{commentLineId}
              </h2>
              <textarea
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                placeholder="Saisissez un commentaire..."
                rows={4}
                className="mb-3 w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeCommentModal}
                  className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={saveComment}
                  disabled={savingComment}
                  className="rounded bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  {savingComment ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
