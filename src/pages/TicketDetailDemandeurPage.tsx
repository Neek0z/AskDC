import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AppLayout } from "../components/AppLayout";
import { supabase } from "../lib/supabase";
import type { ArticleLine, Attachment, Comment, Ticket } from "../types";
import { Badge } from "../components/ui/badge";

interface TicketWithRelations extends Ticket {
  article_lines: ArticleLine[];
  attachments: Attachment[];
  comments: Comment[];
}

type EditableLine = ArticleLine & {
  tarif_text: string;
};

export function TicketDetailDemandeurPage() {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<TicketWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [editLines, setEditLines] = useState<EditableLine[] | null>(null);
  const [editUrgent, setEditUrgent] = useState(false);
  const [editUrgentReason, setEditUrgentReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("tickets")
        .select(
          "*, article_lines (*), attachments (*), comments (*)"
        )
        .eq("id", Number(id))
        .single();
      const t = data as TicketWithRelations;
      setTicket(t);
      setEditLines(
        t?.article_lines?.map((l) => ({
          ...l,
          tarif_text:
            l.tarif != null
              ? (Math.round(Number(l.tarif) * 100) / 100).toFixed(2).replace(".", ",")
              : ""
        })) ?? null
      );
      setEditUrgent(t?.urgent ?? false);
      setEditUrgentReason(t?.urgent_reason ?? "");
      setLoading(false);
    };
    void load();
  }, [id]);

  const isEditable = ticket?.status === "envoye";

  const handleLineFieldChange = (
    lineId: number,
    field: keyof Pick<
      EditableLine,
      "nom_fournisseur" | "marque" | "ref_info" | "ean" | "ref_com" | "designation"
    >,
    value: string
  ) => {
    if (!editLines) return;
    const upper = value.toUpperCase();
    setEditLines((prev) =>
      prev
        ? prev.map((l) => (l.id === lineId ? { ...l, [field]: upper } : l))
        : prev
    );
  };

  const handleLineTarifChange = (lineId: number, value: string) => {
    if (!editLines) return;
    setEditLines((prev) =>
      prev ? prev.map((l) => (l.id === lineId ? { ...l, tarif_text: value } : l)) : prev
    );
  };

  const handleCancel = () => {
    if (!ticket) return;
    setEditLines(
      ticket.article_lines?.map((l) => ({
        ...l,
        tarif_text:
          l.tarif != null
            ? (Math.round(Number(l.tarif) * 100) / 100).toFixed(2).replace(".", ",")
            : ""
      })) ?? null
    );
    setEditUrgent(ticket.urgent ?? false);
    setEditUrgentReason(ticket.urgent_reason ?? "");
    setError(null);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!ticket || !editLines) return;
    setSaving(true);
    setError(null);

    try {
      const { error: ticketError } = await supabase
        .from("tickets")
        .update({
          urgent: editUrgent,
          urgent_reason: editUrgent ? editUrgentReason : null
        })
        .eq("id", ticket.id);
      if (ticketError) {
        setError(ticketError.message);
        setSaving(false);
        return;
      }

      for (const line of editLines) {
        if (ticket.type === "enrichissement") {
          const { error: lineError } = await supabase
            .from("article_lines")
            .update({ nom_fournisseur: line.nom_fournisseur })
            .eq("id", line.id);
          if (lineError) {
            setError(lineError.message);
            setSaving(false);
            return;
          }
        } else {
          const rawTarif = (line as EditableLine).tarif_text?.trim() ?? "";
          let tarif: number | null = null;
          if (rawTarif) {
            const num = Number(rawTarif.replace(",", "."));
            if (Number.isFinite(num)) {
              tarif = Math.round(num * 100) / 100;
            }
          }

          const { error: lineError } = await supabase
            .from("article_lines")
            .update({
              nom_fournisseur: line.nom_fournisseur,
              marque: line.marque,
              ref_info: line.ref_info,
              ean: line.ean,
              ref_com: line.ref_com,
              designation: line.designation,
              tarif
            })
            .eq("id", line.id);
          if (lineError) {
            setError(lineError.message);
            setSaving(false);
            return;
          }
        }
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : JSON.stringify(err);
      setError(msg || "Erreur lors de l'enregistrement des modifications.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      {loading || !ticket ? (
        <div className="text-sm text-slate-600">Chargement du ticket...</div>
      ) : (
        <form onSubmit={isEditable ? handleSave : undefined} className="space-y-6">
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
            <div className="flex items-center gap-2 text-xs">
              {isEditable && (
                <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">
                  Modifiable (statut Envoyé)
                </span>
              )}
              {ticket.urgent && <Badge variant="danger">Urgent</Badge>}
            </div>
          </div>

          {/* Urgence éditable uniquement en statut "envoye" */}
          <section className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-3 text-sm">
            <h2 className="mb-2 text-sm font-semibold text-slate-800">Urgence</h2>
            {isEditable ? (
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={editUrgent}
                    onChange={(e) => setEditUrgent(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Marquer comme urgent
                </label>
                {editUrgent && (
                  <input
                    className="h-8 flex-1 rounded-md border border-input bg-white px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Raison de l'urgence"
                    value={editUrgentReason}
                    onChange={(e) => setEditUrgentReason(e.target.value)}
                  />
                )}
              </div>
            ) : ticket.urgent ? (
              <p className="text-sm text-slate-700">
                Ticket urgent.{" "}
                {ticket.urgent_reason && (
                  <span className="text-slate-600">Raison : {ticket.urgent_reason}</span>
                )}
              </p>
            ) : (
              <p className="text-sm text-slate-500">Ticket non marqué comme urgent.</p>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-800">
              {ticket.type === "enrichissement" ? "Lignes à enrichir" : "Articles"}
            </h2>
            <div className="overflow-x-auto">
              {ticket.type === "enrichissement" ? (
                <table className="min-w-full text-xs md:text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-3 py-0.5 text-left font-medium text-slate-600 dark:text-slate-300">
                        Fournisseur
                      </th>
                      <th className="px-3 py-0.5 text-left font-medium text-slate-600 dark:text-slate-300">
                        CODAG attribué
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(isEditable ? editLines ?? [] : ticket.article_lines)?.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-3 py-0.5">
                          {isEditable ? (
                            <input
                              className="h-7 w-full max-w-xs rounded border border-slate-200 bg-white px-2 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                              value={l.nom_fournisseur}
                              onChange={(e) =>
                                handleLineFieldChange(l.id, "nom_fournisseur", e.target.value)
                              }
                            />
                          ) : (
                            <span className="text-slate-800 dark:text-slate-200">{l.nom_fournisseur}</span>
                          )}
                        </td>
                        <td className="px-3 py-0.5 text-slate-800 dark:text-slate-200">
                          {l.codag_attribue || (
                            <span className="text-slate-400">
                              {isEditable ? "Sera attribué par le GDR" : "En cours"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
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
                      <th className="px-1 py-0.5 text-left font-medium text-slate-600">EAN</th>
                      <th className="px-1 py-0.5 text-left font-medium text-slate-600">
                        Réf com
                      </th>
                      <th className="px-1 py-0.5 text-left font-medium text-slate-600">
                        Désignation
                      </th>
                      <th className="px-1 py-0.5 text-left font-medium text-slate-600">
                        Tarif
                      </th>
                      <th className="px-1 py-0.5 text-left font-medium text-slate-600">
                        CODAG attribué
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(isEditable ? editLines ?? [] : ticket.article_lines)?.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50">
                        {isEditable ? (
                          <>
                            <td className="px-1 py-0.5">
                              <input
                                className="h-7 w-full rounded border border-slate-200 bg-white px-2 text-xs"
                                value={l.nom_fournisseur}
                                onChange={(e) =>
                                  handleLineFieldChange(l.id, "nom_fournisseur", e.target.value)
                                }
                              />
                            </td>
                            <td className="px-1 py-0.5">
                              <input
                                className="h-7 w-full rounded border border-slate-200 bg-white px-2 text-xs"
                                value={l.marque}
                                onChange={(e) =>
                                  handleLineFieldChange(l.id, "marque", e.target.value)
                                }
                              />
                            </td>
                            <td className="px-1 py-0.5">
                              <input
                                className="h-7 w-full rounded border border-slate-200 bg-white px-2 text-xs"
                                value={l.ref_info}
                                onChange={(e) =>
                                  handleLineFieldChange(l.id, "ref_info", e.target.value)
                                }
                              />
                            </td>
                            <td className="px-1 py-0.5">
                              <input
                                className="h-7 w-full rounded border border-slate-200 bg-white px-2 text-xs"
                                value={l.ean}
                                onChange={(e) =>
                                  handleLineFieldChange(l.id, "ean", e.target.value)
                                }
                              />
                            </td>
                            <td className="px-1 py-0.5">
                              <input
                                className="h-7 w-full rounded border border-slate-200 bg-white px-2 text-xs"
                                value={l.ref_com}
                                onChange={(e) =>
                                  handleLineFieldChange(l.id, "ref_com", e.target.value)
                                }
                              />
                            </td>
                            <td className="px-1 py-0.5">
                              <input
                                className="h-7 w-full rounded border border-slate-200 bg-white px-2 text-xs"
                                value={l.designation}
                                onChange={(e) =>
                                  handleLineFieldChange(l.id, "designation", e.target.value)
                                }
                              />
                            </td>
                            <td className="px-1 py-0.5">
                              <input
                                className="h-7 w-24 rounded border border-slate-200 bg-white px-2 text-xs"
                                value={(l as EditableLine).tarif_text}
                                onChange={(e) =>
                                  handleLineTarifChange(l.id, e.target.value)
                                }
                                placeholder="0,00"
                              />
                            </td>
                            <td className="px-1 py-0.5">
                              {l.codag_attribue || (
                                <span className="text-slate-400">Attribué par le GDR</span>
                              )}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-1 py-0.5">{l.nom_fournisseur}</td>
                            <td className="px-1 py-0.5">{l.marque}</td>
                            <td className="px-1 py-0.5">{l.ref_info}</td>
                            <td className="px-1 py-0.5">{l.ean}</td>
                            <td className="px-1 py-0.5">{l.ref_com}</td>
                            <td className="px-1 py-0.5">{l.designation}</td>
                            <td className="px-1 py-0.5">
                              {l.tarif != null ? `${Number(l.tarif).toFixed(2).replace(".", ",")} €` : "-"}
                            </td>
                            <td className="px-1 py-0.5">
                              {l.codag_attribue || (
                                <span className="text-slate-400">En cours</span>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-800">Pièces jointes</h2>
            {ticket.attachments?.length ? (
              <ul className="list-inside list-disc text-sm text-slate-700">
                {ticket.attachments.map((a) => (
                  <li key={a.id}>
                    <a
                      href={a.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      {a.file_name}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Aucune pièce jointe.</p>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-800">Commentaires</h2>
            {ticket.comments?.length ? (
              <div className="space-y-2 text-sm">
                {ticket.comments.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <div className="mb-1 text-xs text-slate-500">
                      {new Date(c.created_at).toLocaleString("fr-FR")}
                    </div>
                    <div>{c.content}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Aucune discussion pour le moment. Le GDR commentera ici si des
                informations complémentaires sont nécessaires.
              </p>
            )}
          </section>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {isEditable && (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                disabled={saving}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                disabled={saving}
              >
                {saving ? "Enregistrement..." : "Enregistrer les modifications"}
              </button>
            </div>
          )}
        </form>
      )}
    </AppLayout>
  );
}

