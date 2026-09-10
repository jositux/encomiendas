import * as XLSX from "xlsx";

/**
 * Exportación genérica a .xlsx (Excel real, vía SheetJS/`xlsx`).
 *
 * Antes esto generaba un .csv (ver historial del proyecto: instalar `xlsx`
 * desde el sandbox de pruebas no es posible porque el store de pnpm real
 * vive en la máquina del usuario, fuera de lo que el sandbox puede alcanzar).
 * El usuario corrió `pnpm add xlsx` en su propia terminal, así que ahora se
 * genera un .xlsx binario real.
 */

export interface ExportColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
  /** Ancho de columna aproximado, en caracteres (opcional). */
  width?: number;
}

export function exportToXlsx<T>(
  filename: string,
  sheetName: string,
  columns: ExportColumn<T>[],
  rows: T[]
) {
  const data = rows.map((row) =>
    Object.fromEntries(columns.map((c) => [c.header, c.value(row) ?? ""]))
  );

  const worksheet = XLSX.utils.json_to_sheet(data, {
    header: columns.map((c) => c.header),
  });
  worksheet["!cols"] = columns.map((c) => ({ wch: c.width ?? Math.max(c.header.length + 2, 12) }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));

  XLSX.writeFile(workbook, filename);
}
