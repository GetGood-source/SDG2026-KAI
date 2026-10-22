import type { SupplierCandidate } from "@workspace/api-zod";

export const DEFAULT_SEARCH_LOCATION = "Petaling Jaya, Selangor, Malaysia";
export const DEFAULT_SEARCH_RADIUS_KM = 25;

export function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const rad = (v: number) => v * Math.PI / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}

export function safeWebUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch { return ""; }
}

export function websiteHost(value: string): string {
  try { return new URL(value).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; }
}

export function isSupplierWebsite(value: string): boolean {
  const host = websiteHost(value);
  return !!host && !/(^|\.)(shopee|lazada|amazon|ebay|facebook|instagram|google|youtube|tiktok)\./i.test(host);
}

const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(w => w.length > 1);
export function hasExactListingEvidence(text: string, part: string, model: string): boolean {
  const found = new Set(words(text));
  const required = [...words(part), ...words(model)];
  return required.length > 0 && required.every(w => found.has(w));
}

// A currency-marked price in an exact-part/model search snippet is still an
// advertised listing price, never a confirmed supplier quote.
export function publishedPrice(text: string, part: string, model: string): { price: number; currency: string; text: string } | null {
  if (!hasExactListingEvidence(text, part, model)) return null;
  const matches = [...text.matchAll(/\b(RM|MYR|USD|SGD|GBP)\s*([\d,]+(?:\.\d{1,2})?)/gi)];
  if (matches.length !== 1) return null;
  // Ranges and "from" prices do not establish a definite price for the part.
  const match = matches[0]!;
  const around = text.slice(Math.max(0, (match.index ?? 0) - 12), (match.index ?? 0) + match[0].length + 16);
  if (/\b(from|starting|up to)\b|[-–]\s*(?:RM|MYR|USD|SGD|GBP)?\s*\d/i.test(around)) return null;
  const price = Number(match[2]!.replace(/,/g, ""));
  if (!Number.isFinite(price) || price <= 0) return null;
  return { price, currency: match[1]!.toUpperCase() === "RM" ? "MYR" : match[1]!.toUpperCase(), text: match[0] };
}

export function rankDiscoveredSuppliers(candidates: SupplierCandidate[], radiusKm: number, currency: string): { winner: SupplierCandidate | undefined; explanation: string } {
  const nearby = candidates.filter(c => c.kind === "nearby" && c.distanceKm !== null && c.distanceKm <= radiusKm);
  const prices = nearby.filter(c => c.publishedPrice !== null && c.priceCurrency === currency).map(c => c.publishedPrice!);
  const minPrice = prices.length ? Math.min(...prices) : null;
  for (const c of candidates) {
    if (c.kind !== "nearby") {
      c.score = 0;
      c.reason = "Online listing only. Seller identity, distance, reviews, exact fitment, availability and delivery must be verified; excluded from the nearby-supplier ranking.";
      continue;
    }
    const distancePoints = c.distanceKm === null ? 0 : Math.max(0, 1 - c.distanceKm / radiusKm) * 45;
    const reviews = c.reviewCount ?? 0;
    const adjustedRating = c.rating !== null && reviews > 0 ? (c.rating * reviews + 3 * 10) / (reviews + 10) : 0;
    const reviewPoints = adjustedRating / 5 * 35;
    const pricePoints = minPrice !== null && c.publishedPrice !== null && c.priceCurrency === currency ? minPrice / c.publishedPrice * 20 : 0;
    c.score = Math.round((distancePoints + reviewPoints + pricePoints) * 10) / 10;
    c.reason = `Distance ${distancePoints.toFixed(1)}/45; Google reviews ${reviewPoints.toFixed(1)}/35 (rating weighted by review count, with a 10-review prior at 3/5); advertised price ${pricePoints.toFixed(1)}/20. ${c.publishedPrice === null ? "No exact-part/model price evidence: quote required." : c.priceCurrency !== currency ? "Different currency: excluded from price comparison." : "Advertised price only; confirm fitment, unit/pack quantity, stock, tax and shipping."} Stock and delivery remain unconfirmed.`;
  }
  nearby.sort((a, b) => b.score - a.score || (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  const winner = nearby[0];
  candidates.sort((a, b) => (a.kind === b.kind ? b.score - a.score : a.kind === "nearby" ? -1 : 1));
  return {
    winner,
    explanation: winner
      ? `${winner.name} is the best nearby lead to contact first (${winner.score}/100), not a confirmed purchasing recommendation. Ranking uses distance 45%, Google rating/review-count evidence 35%, and comparable advertised exact-part/model prices 20%. Missing evidence earns no points and is not proof of poor quality. ${winner.publishedPrice === null ? "No verified advertised price is available for this supplier; obtain a quote." : "Confirm the advertised price with the actual supplier."} Distances are straight-line from the search location's centre, not driving distance or delivery time. A human must confirm fitment, stock, price and delivery before manager approval.`
      : "No supplier with known coordinates was found inside the selected radius. Online listings, if any, are shown separately and are not claimed to be nearby. Broaden the radius or obtain a confirmed quote manually.",
  };
}
