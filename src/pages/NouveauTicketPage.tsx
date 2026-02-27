import { FormEvent, KeyboardEvent, useEffect, useState, ClipboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "../components/AppLayout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import type { ArticleLine, Profile, TicketType } from "../types";
import { downloadArticleTemplate, parseArticleExcel } from "../lib/excel";

type ArticleInputBase = Pick<
  ArticleLine,
  "nom_fournisseur" | "marque" | "ref_info" | "ean" | "ref_com" | "designation"
>;

type ArticleInput = ArticleInputBase & {
  // Valeurs brutes saisies (avec virgule possible), converties en nombre seulement à l'enregistrement.
  tarifs: Record<string, string>;
};

type TariffColumn = { id: string; label: string };

export function NouveauTicketPage() {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const [type, setType] = useState<TicketType>("creation");
  const [gdrId, setGdrId] = useState<string>("");
  const [urgent, setUrgent] = useState(false);
  const [urgentReason, setUrgentReason] = useState("");
  const [gdrList, setGdrList] = useState<Profile[]>([]);
  const [tarifColumns, setTarifColumns] = useState<TariffColumn[]>([
    { id: "tarif-1", label: "Tarif" }
  ]);
  const [articles, setArticles] = useState<ArticleInput[]>([
    {
      nom_fournisseur: "",
      marque: "",
      ref_info: "",
      ean: "",
      ref_com: "",
      designation: "",
      tarifs: { "tarif-1": "" }
    }
  ]);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    nom_fournisseur: 180,
    marque: 120,
    ref_info: 130,
    ean: 110,
    ref_com: 120,
    designation: 220
  });
  const [resizing, setResizing] = useState<{
    key: string;
    startX: number;
    startWidth: number;
  } | null>(null);
  const [linesToAdd, setLinesToAdd] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadGdr = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "gdr")
        .eq("is_active", true)
        .order("full_name", { ascending: true });
      setGdrList((data as Profile[]) || []);
    };
    void loadGdr();
  }, []);

  useEffect(() => {
    // Assure une largeur par défaut pour chaque colonne tarif dynamique
    setColumnWidths((prev) => {
      const next = { ...prev };
      tarifColumns.forEach((c) => {
        if (next[c.id] == null) {
          next[c.id] = 120;
        }
      });
      return next;
    });
  }, [tarifColumns]);

  useEffect(() => {
    if (!resizing) return;

    const onMove = (e: MouseEvent) => {
      const delta = e.clientX - resizing.startX;
      const newWidth = Math.max(80, resizing.startWidth + delta);
      setColumnWidths((prev) => ({
        ...prev,
        [resizing.key]: newWidth
      }));
    };

    const onUp = () => {
      setResizing(null);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizing]);

  const updateArticleField = (
    index: number,
    field: keyof ArticleInputBase,
    value: string
  ) => {
    const upper = value.toUpperCase();
    setArticles((prev) =>
      prev.map((a, i) => (i === index ? { ...a, [field]: upper } : a))
    );
  };

  const updateArticleTarif = (index: number, columnId: string, value: string) => {
    setArticles((prev) =>
      prev.map((a, i) =>
        i === index
          ? {
              ...a,
              tarifs: {
                ...a.tarifs,
                [columnId]: value
              }
            }
          : a
      )
    );
  };

  const addArticle = (count = 1) => {
    const safeCount = Number.isFinite(count) && count > 0 ? Math.min(Math.floor(count), 200) : 1;
    setArticles((prev) => {
      const baseTarifs = Object.fromEntries(tarifColumns.map((c) => [c.id, ""]));
      const newRows: ArticleInput[] = Array.from({ length: safeCount }, () => ({
        nom_fournisseur: "",
        marque: "",
        ref_info: "",
        ean: "",
        ref_com: "",
        designation: "",
        tarifs: { ...baseTarifs }
      }));
      return [...prev, ...newRows];
    });
  };

  const removeArticle = (index: number) => {
    setArticles((prev) => {
      if (prev.length === 1) {
        return [
          {
            nom_fournisseur: "",
            marque: "",
            ref_info: "",
            ean: "",
            ref_com: "",
            designation: "",
            tarifs: Object.fromEntries(tarifColumns.map((c) => [c.id, ""]))
          }
        ];
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const addTarifColumn = () => {
    setTarifColumns((prev) => {
      const nextIndex = prev.length + 1;
      const id = `tarif-${nextIndex}`;
      const label = nextIndex === 1 ? "Tarif" : `Tarif ${nextIndex}`;
      const next = [...prev, { id, label }];
      setArticles((arts) =>
        arts.map((a) => ({
          ...a,
          tarifs: { ...a.tarifs, [id]: a.tarifs[id] ?? "" }
        }))
      );
      return next;
    });
  };

  const removeTarifColumn = (id: string) => {
    setTarifColumns((prev) => {
      if (prev.length === 1) return prev;
      const next = prev.filter((c) => c.id !== id);
      setArticles((arts) =>
        arts.map((a) => {
          const { [id]: _removed, ...rest } = a.tarifs;
          const normalized = Object.fromEntries(
            next.map((c) => [c.id, rest[c.id] ?? ""])
          );
          return { ...a, tarifs: normalized };
        })
      );
      return next;
    });
  };

  const updateTarifColumnLabel = (id: string, label: string) => {
    setTarifColumns((prev) => prev.map((c) => (c.id === id ? { ...c, label } : c)));
  };

  const handleExcelImport = async (file: File) => {
    const parsed = await parseArticleExcel(file);
    if (parsed.length > 0) {
      // On réinitialise les colonnes tarif avec une seule colonne "Tarif"
      setTarifColumns([{ id: "tarif-1", label: "Tarif" }]);
      setArticles(
        parsed.map((p) => ({
          nom_fournisseur: p.nom_fournisseur,
          marque: p.marque,
          ref_info: p.ref_info,
          ean: p.ean,
          ref_com: p.ref_com,
          designation: p.designation,
          tarifs: {
            "tarif-1":
              p.tarif != null
                ? (Math.round(p.tarif * 100) / 100).toFixed(2).replace(".", ",")
                : ""
          }
        }))
      );
    }
  };

  const startResize = (key: string, clientX: number) => {
    const current = columnWidths[key] ?? 120;
    setResizing({
      key,
      startX: clientX,
      startWidth: current
    });
  };

  const copyTableToClipboard = async () => {
    const header = [
      "NOM FOURNISSEUR",
      "MARQUE",
      "REF INFO",
      "EAN",
      "REF COM",
      "DESIGNATION",
      ...tarifColumns.map((c) => (c.label || "TARIF").toUpperCase())
    ];

    const rows = articles
      .filter(
        (a) =>
          a.nom_fournisseur ||
          a.marque ||
          a.ref_info ||
          a.ean ||
          a.ref_com ||
          a.designation ||
          Object.values(a.tarifs).some((v) => (v ?? "").toString().trim() !== "")
      )
      .map((a) => {
        const fixed = [
          a.nom_fournisseur ?? "",
          a.marque ?? "",
          a.ref_info ?? "",
          a.ean ?? "",
          a.ref_com ?? "",
          a.designation ?? ""
        ];
        const tarifs = tarifColumns.map((c) => (a.tarifs[c.id] ?? "").toString());
        return [...fixed, ...tarifs];
      });

    const content = [header, ...rows].map((r) => r.join("\t")).join("\n");

    try {
      await navigator.clipboard.writeText(content);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    // Optionnel: petite confirmation native
    window.alert("Tableau copié dans le presse-papiers.");
  };

  const resetTicket = () => {
    if (
      !window.confirm(
        "Voulez-vous vraiment réinitialiser le ticket ? Toutes les informations saisies seront perdues."
      )
    ) {
      return;
    }

    setType("creation");
    setGdrId("");
    setUrgent(false);
    setUrgentReason("");
    setTarifColumns([{ id: "tarif-1", label: "Tarif" }]);
    setArticles([
      {
        nom_fournisseur: "",
        marque: "",
        ref_info: "",
        ean: "",
        ref_com: "",
        designation: "",
        tarifs: { "tarif-1": null }
      }
    ]);
    setLinesToAdd(1);
    setError(null);
  };

  const handlePasteFromExcel = (
    e: ClipboardEvent<HTMLInputElement>,
    startRow: number,
    startCol: number
  ) => {
    const text = e.clipboardData.getData("text");
    if (!text) return;
    e.preventDefault();

    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trimEnd())
      .filter((l) => l.length > 0);

    if (!lines.length) return;

    const maxCols = 6 + tarifColumns.length;
    const baseTarifs = Object.fromEntries(tarifColumns.map((c) => [c.id, ""]));

    setArticles((prev) => {
      const next = [...prev];

      lines.forEach((line, rowOffset) => {
        const targetIndex = startRow + rowOffset;
        const cells = line.split("\t").slice(0, maxCols - startCol);

        const existing = next[targetIndex];
        const current: ArticleInput = existing
          ? {
              ...existing,
              tarifs: {
                ...baseTarifs,
                ...existing.tarifs
              }
            }
          : {
              nom_fournisseur: "",
              marque: "",
              ref_info: "",
              ean: "",
              ref_com: "",
              designation: "",
              tarifs: { ...baseTarifs }
            };

        const updated: ArticleInput = {
          ...current,
          tarifs: { ...current.tarifs }
        };

        cells.forEach((cell, cellIndex) => {
          const globalCol = startCol + cellIndex;
          const raw = (cell ?? "").toString();
          const value = raw.toUpperCase();

          if (globalCol === 0) {
            updated.nom_fournisseur = value || updated.nom_fournisseur;
          } else if (globalCol === 1) {
            updated.marque = value || updated.marque;
          } else if (globalCol === 2) {
            updated.ref_info = value || updated.ref_info;
          } else if (globalCol === 3) {
            updated.ean = value || updated.ean;
          } else if (globalCol === 4) {
            updated.ref_com = value || updated.ref_com;
          } else if (globalCol === 5) {
            updated.designation = value || updated.designation;
          } else if (globalCol >= 6) {
            const tarifIndex = globalCol - 6;
            const col = tarifColumns[tarifIndex];
            if (!col) return;
            updated.tarifs[col.id] = raw;
          }
        });

        next[targetIndex] = updated;
      });

      return next;
    });
  };

  const handleFormKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter") {
      const target = e.target as HTMLElement | null;
      // On laisse la gestion aux cellules du tableau article
      if (target?.dataset?.articleCell === "1") return;
      e.preventDefault();
    }
  };

  const handleArticleCellKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    colIndex: number
  ) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    e.stopPropagation();

    const totalCols = 6 + tarifColumns.length;
    let nextRow = rowIndex;
    let nextCol = colIndex + 1;

    if (nextCol >= totalCols) {
      nextCol = 0;
      nextRow = rowIndex + 1;
    }

    const next = document.querySelector<HTMLInputElement>(
      `[data-article-cell="1"][data-row="${nextRow}"][data-col="${nextCol}"]`
    );
    if (next) {
      next.focus();
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSubmitting(true);
    setError(null);

    try {
      const reference = `CODAG-${Date.now()}`;
      const { data: ticketData, error: ticketError } = await supabase
        .from("tickets")
        .insert({
          reference,
          type,
          status: "envoye",
          urgent,
          urgent_reason: urgent ? urgentReason : null,
          demandeur_id: userId,
          gdr_id: gdrId || null
        })
        .select("id")
        .single();

      if (ticketError || !ticketData) {
        // Erreur côté Supabase (contrainte, RLS, etc.)
        // On l'affiche telle quelle au lieu d'un générique.
        // eslint-disable-next-line no-console
        console.error("Erreur création ticket", ticketError);
        setError(ticketError?.message || "Erreur lors de la création du ticket.");
        setSubmitting(false);
        return;
      }

      const ticketId = ticketData.id as number;

      const cleanArticles = articles.filter(
        (a) => a.nom_fournisseur && a.marque && a.ref_info && a.designation
      );

      if (cleanArticles.length > 0) {
        const { error: articleError } = await supabase.from("article_lines").insert(
          cleanArticles.map((a) => {
            const firstTarifColId = tarifColumns[0]?.id;
            let firstTarif: number | null = null;
            if (firstTarifColId != null) {
              const raw = (a.tarifs[firstTarifColId] ?? "").toString().trim();
              if (raw) {
                const num = Number(raw.replace(",", "."));
                if (Number.isFinite(num)) {
                  firstTarif = Math.round(num * 100) / 100;
                }
              }
            }
            return {
              nom_fournisseur: a.nom_fournisseur,
              marque: a.marque,
              ref_info: a.ref_info,
              ean: a.ean,
              ref_com: a.ref_com,
              designation: a.designation,
              tarif: firstTarif,
              ticket_id: ticketId
            };
          })
        );
        if (articleError) {
          // eslint-disable-next-line no-console
          console.error("Erreur création lignes article", articleError);
          setError(
            articleError.message ||
              "Erreur lors de la création des lignes articles (vérifiez les tarifs)."
          );
          setSubmitting(false);
          return;
        }
      }

      navigate("/mes-tickets", { state: { ticketCreated: true }, replace: true });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Erreur inattendue création ticket", err);
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : JSON.stringify(err);
      setError(msg || "Erreur inconnue");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <form onSubmit={onSubmit} onKeyDown={handleFormKeyDown} className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-900">Nouvelle demande</h1>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs text-slate-600"
            onClick={resetTicket}
          >
            Réinitialiser le ticket
          </Button>
        </div>

        <Card className="py-3">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm">Informations générales</CardTitle>
          </CardHeader>
          <div className="grid gap-3 md:grid-cols-4 px-4 pb-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Type</label>
              <select
                className="h-8 w-full rounded-md border border-input bg-white px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={type}
                onChange={(e) => setType(e.target.value as TicketType)}
              >
                <option value="creation">Création CODAG</option>
                <option value="enrichissement">Enrichissement</option>
                <option value="creation_enrichissement">
                  Création CODAG + enrichissement
                </option>
              </select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-medium text-slate-700">GDR (optionnel)</label>
              <select
                className="h-8 w-full rounded-md border border-input bg-white px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={gdrId}
                onChange={(e) => setGdrId(e.target.value)}
              >
                <option value="">Non assigné</option>
                {gdrList.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.full_name || g.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Urgence</label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={urgent}
                  onChange={(e) => setUrgent(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300"
                />
                <span className="text-xs text-slate-600">Marquer comme urgent</span>
              </div>
            </div>
          </div>
          {urgent && (
            <div className="px-4 pb-3">
              <Input
                className="h-8 text-xs"
                placeholder="Raison de l'urgence"
                value={urgentReason}
                onChange={(e) => setUrgentReason(e.target.value)}
              />
            </div>
          )}
        </Card>

        <Card className="py-3">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm">Articles</CardTitle>
          </CardHeader>
          <div className="mb-3 flex items-start justify-between gap-2 px-4 text-[11px]">
            <div className="inline-flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1">
              <span className="text-slate-600">
                Saisissez ou collez vos lignes d&apos;articles depuis Excel.
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2"
                onClick={() => downloadArticleTemplate()}
              >
                Modèle Excel
              </Button>
              <label className="inline-flex h-7 cursor-pointer items-center rounded-md border border-dashed border-primary/40 px-2 text-[11px] text-primary hover:bg-primary/5">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      void handleExcelImport(file);
                    }
                  }}
                />
                Importer
              </label>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={() => void copyTableToClipboard()}
            >
              Copier le tableau
            </Button>
          </div>
          <div className="overflow-x-auto rounded-md border border-slate-200 bg-slate-50 px-1 py-1">
            <table className="min-w-full border-separate border-spacing-y-1 text-[11px] md:text-xs table-fixed">
              <thead>
                <tr className="bg-slate-100 text-[11px] uppercase tracking-wide text-slate-600">
                  <th
                    className="px-1.5 py-1 text-left"
                    style={{ width: columnWidths.nom_fournisseur }}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span>NOM FOURNISSEUR</span>
                      <span
                        className="h-5 w-[3px] cursor-col-resize select-none rounded bg-slate-300"
                        onMouseDown={(e) => startResize("nom_fournisseur", e.clientX)}
                      />
                    </div>
                  </th>
                  <th
                    className="px-1.5 py-1 text-left"
                    style={{ width: columnWidths.marque }}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span>MARQUE</span>
                      <span
                        className="h-5 w-[3px] cursor-col-resize select-none rounded bg-slate-300"
                        onMouseDown={(e) => startResize("marque", e.clientX)}
                      />
                    </div>
                  </th>
                  <th
                    className="px-1.5 py-1 text-left"
                    style={{ width: columnWidths.ref_info }}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span>REF INFO</span>
                      <span
                        className="h-5 w-[3px] cursor-col-resize select-none rounded bg-slate-300"
                        onMouseDown={(e) => startResize("ref_info", e.clientX)}
                      />
                    </div>
                  </th>
                  <th
                    className="px-1.5 py-1 text-left"
                    style={{ width: columnWidths.ean }}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span>EAN</span>
                      <span
                        className="h-5 w-[3px] cursor-col-resize select-none rounded bg-slate-300"
                        onMouseDown={(e) => startResize("ean", e.clientX)}
                      />
                    </div>
                  </th>
                  <th
                    className="px-1.5 py-1 text-left"
                    style={{ width: columnWidths.ref_com }}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span>REF COM</span>
                      <span
                        className="h-5 w-[3px] cursor-col-resize select-none rounded bg-slate-300"
                        onMouseDown={(e) => startResize("ref_com", e.clientX)}
                      />
                    </div>
                  </th>
                  <th
                    className="px-1.5 py-1 text-left"
                    style={{ width: columnWidths.designation }}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span>DESIGNATION</span>
                      <span
                        className="h-5 w-[3px] cursor-col-resize select-none rounded bg-slate-300"
                        onMouseDown={(e) => startResize("designation", e.clientX)}
                      />
                    </div>
                  </th>
                  {tarifColumns.map((col) => (
                    <th
                      key={col.id}
                      className="px-1.5 py-1 text-left"
                      style={{ width: columnWidths[col.id] }}
                    >
                      <div className="flex items-center gap-1">
                        <Input
                          className="h-7 w-28 rounded border border-slate-300 bg-white px-2 text-[11px]"
                          value={col.label}
                          onChange={(e) => updateTarifColumnLabel(col.id, e.target.value)}
                          placeholder="Tarif"
                        />
                        {tarifColumns.length > 1 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 px-0"
                            onClick={() => removeTarifColumn(col.id)}
                            aria-label="Supprimer la colonne tarif"
                            title="Supprimer la colonne tarif"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              className="h-3 w-3 text-slate-500"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M3 6h18" />
                              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <path d="M10 11v6" />
                              <path d="M14 11v6" />
                              <path d="M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14" />
                            </svg>
                          </Button>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="px-1 py-1 text-left align-middle">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 px-0"
                      onClick={addTarifColumn}
                      aria-label="Ajouter une colonne tarif"
                      title="Ajouter une colonne tarif"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        className="h-3 w-3 text-slate-500"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 5v14" />
                        <path d="M5 12h14" />
                      </svg>
                    </Button>
                  </th>
                  <th className="px-2 py-1" />
                </tr>
              </thead>
              <tbody>
                {articles.map((a, idx) => (
                  <tr key={idx} className="align-top">
                    <td
                      className="px-1.5 py-1"
                      style={{ width: columnWidths.nom_fournisseur }}
                    >
                      <Input
                        placeholder="Nom fournisseur"
                        value={a.nom_fournisseur}
                        onChange={(e) =>
                          updateArticleField(idx, "nom_fournisseur", e.target.value)
                        }
                        onPaste={(e) => handlePasteFromExcel(e, idx, 0)}
                        data-article-cell="1"
                        data-row={idx}
                        data-col={0}
                        onKeyDown={(e) => handleArticleCellKeyDown(e, idx, 0)}
                      />
                    </td>
                    <td
                      className="px-1.5 py-1"
                      style={{ width: columnWidths.marque }}
                    >
                      <Input
                        placeholder="Marque"
                        value={a.marque}
                        onChange={(e) => updateArticleField(idx, "marque", e.target.value)}
                        onPaste={(e) => handlePasteFromExcel(e, idx, 1)}
                        data-article-cell="1"
                        data-row={idx}
                        data-col={1}
                        onKeyDown={(e) => handleArticleCellKeyDown(e, idx, 1)}
                      />
                    </td>
                    <td
                      className="px-1.5 py-1"
                      style={{ width: columnWidths.ref_info }}
                    >
                      <Input
                        placeholder="Réf info"
                        value={a.ref_info}
                        onChange={(e) =>
                          updateArticleField(idx, "ref_info", e.target.value)
                        }
                        onPaste={(e) => handlePasteFromExcel(e, idx, 2)}
                        data-article-cell="1"
                        data-row={idx}
                        data-col={2}
                        onKeyDown={(e) => handleArticleCellKeyDown(e, idx, 2)}
                      />
                    </td>
                    <td
                      className="px-1.5 py-1"
                      style={{ width: columnWidths.ean }}
                    >
                      <Input
                        placeholder="EAN"
                        value={a.ean}
                        onChange={(e) => updateArticleField(idx, "ean", e.target.value)}
                        onPaste={(e) => handlePasteFromExcel(e, idx, 3)}
                        data-article-cell="1"
                        data-row={idx}
                        data-col={3}
                        onKeyDown={(e) => handleArticleCellKeyDown(e, idx, 3)}
                      />
                    </td>
                    <td
                      className="px-1.5 py-1"
                      style={{ width: columnWidths.ref_com }}
                    >
                      <Input
                        placeholder="Réf com"
                        value={a.ref_com}
                        onChange={(e) => updateArticleField(idx, "ref_com", e.target.value)}
                        onPaste={(e) => handlePasteFromExcel(e, idx, 4)}
                        data-article-cell="1"
                        data-row={idx}
                        data-col={4}
                        onKeyDown={(e) => handleArticleCellKeyDown(e, idx, 4)}
                      />
                    </td>
                    <td
                      className="px-1.5 py-1"
                      style={{ width: columnWidths.designation }}
                    >
                      <Input
                        placeholder="Désignation"
                        value={a.designation}
                        onChange={(e) =>
                          updateArticleField(idx, "designation", e.target.value)
                        }
                        onPaste={(e) => handlePasteFromExcel(e, idx, 5)}
                        data-article-cell="1"
                        data-row={idx}
                        data-col={5}
                        onKeyDown={(e) => handleArticleCellKeyDown(e, idx, 5)}
                      />
                    </td>
                    {tarifColumns.map((col, tarifIndex) => (
                      <td
                        key={col.id}
                        className="px-1.5 py-1"
                        style={{ width: columnWidths[col.id] }}
                      >
                        <Input
                          placeholder={col.label || "Tarif"}
                          type="text"
                          value={a.tarifs[col.id] ?? ""}
                          onChange={(e) =>
                            updateArticleTarif(idx, col.id, e.target.value)
                          }
                          onPaste={(e) =>
                            handlePasteFromExcel(e, idx, 6 + tarifIndex)
                          }
                          data-article-cell="1"
                          data-row={idx}
                          data-col={6 + tarifIndex}
                          onKeyDown={(e) =>
                            handleArticleCellKeyDown(e, idx, 6 + tarifIndex)
                          }
                        />
                      </td>
                    ))}
                    <td className="px-1.5 py-1 text-center align-middle">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 px-0"
                        onClick={() => removeArticle(idx)}
                        aria-label="Supprimer la ligne"
                        title="Supprimer la ligne"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          className="h-4 w-4 text-slate-500"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 6h18" />
                          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                          <path d="M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14" />
                        </svg>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
            <span>Ajouter</span>
            <Input
              type="number"
              className="h-7 w-16 px-2 text-xs"
              min={1}
              max={200}
              value={linesToAdd}
              onChange={(e) => {
                const v = Number(e.target.value);
                setLinesToAdd(Number.isFinite(v) && v > 0 ? Math.min(Math.floor(v), 200) : 1);
              }}
            />
            <span>ligne(s)</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="px-2"
              onClick={() => addArticle(linesToAdd)}
            >
              Ajouter
            </Button>
          </div>
        </Card>

        {/* TODO: zone de dépôt et upload vers Supabase Storage */}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Création en cours..." : "Créer le ticket"}
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}

