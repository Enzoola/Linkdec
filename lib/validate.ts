export const USERNAME_RE = /^[a-z0-9_]{3,30}$/;

// Keep in sync with the check constraint in supabase/schema.sql.
export const RESERVED = new Set([
  "admin","api","app","auth","dashboard","login","logout","signup","signin","settings",
  "support","help","about","terms","privacy","static","assets","_next","favicon","robots",
  "sitemap","www","mail","root","null","undefined","linkdeck","go","new","explore",
]);

export function usernameError(u: string): string | null {
  if (!USERNAME_RE.test(u)) return "Use 3 to 30 lowercase letters, numbers or underscores.";
  if (RESERVED.has(u)) return "That name is reserved. Try another.";
  return null;
}

export function isHttpUrl(u: string): boolean {
  return /^https?:\/\/[^\s/]+\.[^\s/]+/i.test(u) && u.length <= 2000;
}

export function normUrl(v: string): string {
  const t = v.trim();
  if (t && !/^[a-z][a-z0-9+.-]*:/i.test(t)) return "https://" + t;
  return t;
}

export function hostOf(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "?";
  return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

export const THEMES: [string, string][] = [
  ["ink", "Ink"], ["chalk", "Chalk"], ["sun", "Sunrise"], ["lagos", "Lagos"], ["cobalt", "Cobalt"],
];
export const SHAPES: [string, string][] = [["square", "Square"], ["round", "Rounded"], ["pill", "Pill"]];
export const FILLS: [string, string][] = [["solid", "Solid"], ["outline", "Outline"], ["soft", "Soft"]];

export const BOT_RE = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|monitor|curl|wget|python-requests/i;
