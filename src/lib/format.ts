export function formatAttributeValue(value: unknown): string | number {
  if (typeof value === "boolean") return value ? "Sim" : "Não"
  if (typeof value === "number") return value
  return String(value ?? "")
}
