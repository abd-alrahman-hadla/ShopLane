/** Human-facing order number, e.g. 7 → "SL-0007". */
export function formatOrderNumber(number: number): string {
  return `SL-${String(number).padStart(4, "0")}`;
}
