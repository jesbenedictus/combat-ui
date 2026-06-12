export function valueWithUnit(raw: string|null, unit: string): string | null {
  if (raw === null || raw.trim() === "") return null;
  const numeric = Number(raw);
  return Number.isNaN(numeric) ? raw : `${numeric}${unit}`;
}