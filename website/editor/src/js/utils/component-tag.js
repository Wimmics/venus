export function normalizeComponentTag(raw, fallback = "venus-graph") {
  const text = String(raw || "").trim().toLowerCase();
  if (!text) return fallback;
  if (text.startsWith("venus-")) return text;
  if (text.startsWith("vis-")) return `venus-${text.slice(4)}`;
  return `venus-${text.replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "")}`;
}

export function toComponentVarName(tag) {
  const cleaned = String(tag || "venus-component")
    .replace(/^(venus|vis)-/, "")
    .replace(/[^a-z0-9-]+/gi, "-");
  const parts = cleaned.split("-").filter(Boolean);
  if (!parts.length) return "component";
  const [first, ...rest] = parts;
  return `${first}${rest.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("")}`;
}
