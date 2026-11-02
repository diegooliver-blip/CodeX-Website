/** Formatting shared by the client panel's server and client components. */

const TZ = "America/Mexico_City";

export const fmtMoney = (cents: number, currency = "MXN") =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency, maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);

/** Dates without time (yyyy-mm-dd) are calendar days: format them as such, not as UTC midnight. */
export const fmtDay = (iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("es-MX", { ...opts, timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
};

export const fmtMonth = (ym: string, style: "long" | "short" = "long") => {
  const [y, m] = ym.split("-").map(Number);
  return new Intl.DateTimeFormat("es-MX", { month: style, year: style === "long" ? "numeric" : undefined, timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, 15)),
  );
};

export const fmtCompact = (n: number) => new Intl.NumberFormat("es-MX", { notation: "compact", maximumFractionDigits: 1 }).format(n);

export const daysUntil = (iso: string) => {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
  return Math.round((Date.parse(iso.slice(0, 10)) - Date.parse(today)) / 86_400_000);
};
