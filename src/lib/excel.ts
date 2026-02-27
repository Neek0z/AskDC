import * as XLSX from "xlsx";
import type { ArticleLine } from "../types";

// En-têtes par défaut du modèle (en majuscules).
// Les utilisateurs peuvent renommer la colonne "TARIF" (ex: "TARIF PROMO"),
// l'import repèrera toute colonne dont le nom commence par "TARIF" (insensible à la casse).
const TEMPLATE_HEADERS = [
  "NOM FOURNISSEUR",
  "MARQUE",
  "REF INFO",
  "EAN",
  "REF COM",
  "DESIGNATION",
  "TARIF"
];

export function downloadArticleTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Articles");
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "modele_articles_codag.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}

export async function parseArticleExcel(file: File): Promise<
  Pick<
    ArticleLine,
    "nom_fournisseur" | "marque" | "ref_info" | "ean" | "ref_com" | "designation" | "tarif"
  >[]
> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 }) as string[][];

  if (!rows.length) return [];

  const [headerRow, ...body] = rows;
  const normalize = (h: unknown) =>
    typeof h === "string" ? h.trim().toUpperCase() : "";
  const normalizedHeaderRow = headerRow.map(normalize);

  // On ne se base plus sur le nom exact des 6 premières colonnes,
  // seulement sur leur position (ordre fixe attendu).
  const idxNomFournisseur = 0;
  const idxMarque = 1;
  const idxRefInfo = 2;
  const idxEan = 3;
  const idxRefCom = 4;
  const idxDesignation = 5;

  // Pour les colonnes tarif, on garde une détection par nom en MAJ (TARIF…).
  const idxTarif = normalizedHeaderRow.findIndex(
    (h) => typeof h === "string" && h.startsWith("TARIF")
  );

  return body
    .filter((row) => row && row.length > 0 && row.some((cell) => !!cell))
    .map((row) => {
      const toUpper = (v: unknown) =>
        (v ?? "").toString().trim().toUpperCase();

      const nom_fournisseur = toUpper(row[idxNomFournisseur]);
      const marque = toUpper(row[idxMarque]);
      const ref_info = toUpper(row[idxRefInfo]);
      const ean = toUpper(row[idxEan]);
      const ref_com = toUpper(row[idxRefCom]);
      const designation = toUpper(row[idxDesignation]);
      const tarifRaw = idxTarif >= 0 ? row[idxTarif] : undefined;
      const tarifNum =
        typeof tarifRaw === "number"
          ? tarifRaw
          : tarifRaw
          ? Number(String(tarifRaw).replace(",", "."))
          : Number.NaN;
      const tarif = Number.isFinite(tarifNum)
        ? Math.round(tarifNum * 100) / 100
        : null;

      return {
        nom_fournisseur,
        marque,
        ref_info,
        ean,
        ref_com,
        designation,
        tarif: Number.isFinite(tarif as number) ? (tarif as number) : null
      };
    })
    .filter((l) => l.nom_fournisseur && l.marque && l.ref_info && l.designation);
}

