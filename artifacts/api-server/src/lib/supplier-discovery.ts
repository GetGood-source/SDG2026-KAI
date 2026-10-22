import { createHash } from "node:crypto";
import type { PartRequest, Settings, SupplierCandidate, SupplierDiscovery } from "@workspace/api-zod";
import { DEFAULT_SEARCH_LOCATION, DEFAULT_SEARCH_RADIUS_KM, distanceKm, isSupplierWebsite, publishedPrice, rankDiscoveredSuppliers, safeWebUrl, websiteHost } from "./supplier-search-evidence";

type ObjectValue = Record<string, unknown>;
const object = (v: unknown): ObjectValue => v && typeof v === "object" && !Array.isArray(v) ? v as ObjectValue : {};
const list = (v: unknown): ObjectValue[] => Array.isArray(v) ? v.map(object) : [];
const text = (v: unknown): string => typeof v === "string" ? v : "";
const number = (v: unknown): number | null => typeof v === "number" && Number.isFinite(v) ? v : null;
const stableId = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 20);
const coordinates = (v: unknown) => {
  const point = object(v);
  const latitude = number(point.latitude);
  const longitude = number(point.longitude);
  return latitude !== null && longitude !== null && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 ? { latitude, longitude } : null;
};
const geoCache = new Map<string, { latitude: number; longitude: number; expires: number }>();

async function search(params: Record<string, string>): Promise<ObjectValue> {
  const key = process.env.SERPAPI_API_KEY?.trim();
  if (!key) throw new Error("Live Google search is not configured. Add SERPAPI_API_KEY in workspace secrets.");
  const url = new URL("https://serpapi.com/search.json");
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  url.searchParams.set("api_key", key);
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(12000), headers: { accept: "application/json" } });
  } catch { throw new Error("Google search provider timed out or could not be reached. Retry later or record a supplier quote manually."); }
  // Never propagate upstream URLs/errors: SerpApi URLs can contain credentials.
  if (response.status === 401 || response.status === 403) throw new Error(`SerpApi rejected the configured key or account permission (HTTP ${response.status}). Check the search provider account.`);
  if (response.status === 429) throw new Error("SerpApi search quota or rate limit reached. Check the provider account and retry later.");
  if (!response.ok) throw new Error(`Search provider returned HTTP ${response.status}. No search evidence was invented.`);
  let data: ObjectValue;
  try { data = object(await response.json()); } catch { throw new Error("Search provider returned unreadable data. No search evidence was invented."); }
  if (typeof data.error === "string" && /hasn.t returned any results|no results (?:were )?found/i.test(data.error)) return {};
  if (data.error) throw new Error("Search provider could not complete this query. Check the provider's account/quota and try a more specific part or location.");
  return data;
}

async function geocode(location: string) {
  const key = location.trim().toLowerCase();
  const cached = geoCache.get(key);
  if (cached && cached.expires > Date.now()) return cached;
  const data = await search({ engine: "google_maps", type: "search", q: location, hl: "en" });
  const place = object(data.place_results);
  const center = coordinates(place.gps_coordinates);
  if (!center) throw new Error("The search location could not be resolved to a Google Maps place. Enter a more specific city or shop address in Settings.");
  geoCache.set(key, { ...center, expires: Date.now() + 86400000 });
  return center;
}

function blankCandidate(id: string, kind: "nearby" | "web", name: string, sourceUrl: string): SupplierCandidate {
  return {
    id, kind, name, title: name, sourceUrl, address: "", phone: "", website: "",
    distanceKm: null, rating: null, reviewCount: null, publishedPrice: null,
    priceCurrency: null, priceText: "Quote required", priceSourceUrl: "", snippet: "", score: 0, reason: "",
  };
}

function googleListings(data: ObjectValue, request: PartRequest): SupplierCandidate[] {
  return list(data.organic_results).slice(0, 8).flatMap(item => {
    const link = safeWebUrl(item.link);
    const title = text(item.title);
    if (!link || !title) return [];
    const snippet = `${title}. ${text(item.snippet)}`;
    const candidate = blankCandidate(`web-${stableId(link)}`, "web", text(item.source) || websiteHost(link), link);
    candidate.title = title;
    candidate.website = link;
    candidate.snippet = snippet;
    const price = publishedPrice(snippet, request.partName, request.model);
    if (price) {
      candidate.publishedPrice = price.price;
      candidate.priceCurrency = price.currency;
      candidate.priceText = `${price.text} advertised; unit/pack and fitment unconfirmed`;
      candidate.priceSourceUrl = link;
    }
    return [candidate];
  });
}

function attachPrice(candidate: SupplierCandidate, listings: SupplierCandidate[]) {
  if (!isSupplierWebsite(candidate.website)) return;
  const matching = listings.find(c => c.publishedPrice !== null && websiteHost(c.sourceUrl) === websiteHost(candidate.website));
  if (matching) {
    candidate.publishedPrice = matching.publishedPrice;
    candidate.priceCurrency = matching.priceCurrency;
    candidate.priceText = matching.priceText;
    candidate.priceSourceUrl = matching.sourceUrl;
  }
}

export function emptyDiscovery(request: PartRequest, settings: Settings, status: SupplierDiscovery["status"], note: string): SupplierDiscovery {
  return {
    searchId: crypto.randomUUID(), status, query: `${request.partName} ${request.model}`,
    location: settings.searchLocation || DEFAULT_SEARCH_LOCATION,
    radiusKm: settings.searchRadiusKm ?? DEFAULT_SEARCH_RADIUS_KM,
    centerLatitude: null, centerLongitude: null,
    fetchedAt: new Date().toISOString(), cacheUntil: new Date(Date.now() + 120000).toISOString(),
    candidates: [], recommendedCandidateId: null, preferredCandidateId: null, recommendation: "", note,
  };
}

export async function discoverSuppliers(request: PartRequest, settings: Settings): Promise<SupplierDiscovery> {
  const result = emptyDiscovery(request, settings, "complete", "");
  const center = await geocode(result.location);
  result.centerLatitude = center.latitude;
  result.centerLongitude = center.longitude;
  const industry = /auto|car|vehicle/i.test(settings.industry) ? "auto spare parts" : `${settings.industry} spare parts`;
  const googleQuery = `${request.partName} ${request.model} price ${result.location}`.slice(0, 450);
  result.query = googleQuery;
  const warnings: string[] = [];
  const [mapAttempt, webAttempt] = await Promise.allSettled([
    search({ engine: "google_maps", type: "search", q: `${industry} ${request.partName} ${request.model} ${result.location}`.slice(0, 450), ll: `@${center.latitude},${center.longitude},12z`, hl: "en" }),
    search({ engine: "google", q: googleQuery, hl: "en", num: "10" }),
  ]);
  if (mapAttempt.status === "rejected" && webAttempt.status === "rejected") throw new Error("Google Maps and Search could not complete. Check SerpApi key/quota or retry later.");
  let maps = mapAttempt.status === "fulfilled" ? mapsFrom(mapAttempt.value) : [];
  if (mapAttempt.status === "rejected") warnings.push("Nearby supplier search failed; no local reviews or distances could be verified.");
  if (!maps.length && mapAttempt.status === "fulfilled") {
    try {
      maps = mapsFrom(await search({ engine: "google_maps", type: "search", q: `${industry} suppliers ${result.location}`, ll: `@${center.latitude},${center.longitude},12z`, hl: "en" }));
    } catch { warnings.push("The broader nearby-supplier search could not complete."); }
  }
  const web = webAttempt.status === "fulfilled" ? googleListings(webAttempt.value, request) : [];
  if (webAttempt.status === "rejected") warnings.push("Published-price search failed. Obtain prices directly from suppliers.");
  const nearby = maps.flatMap(item => {
    const point = coordinates(item.gps_coordinates);
    if (!point || !text(item.title)) return [];
    const distance = distanceKm(center, point);
    if (distance > result.radiusKm) return [];
    const sourceUrl = `https://www.google.com/maps/search/?api=1&query=${point.latitude},${point.longitude}${text(item.place_id) ? `&query_place_id=${encodeURIComponent(text(item.place_id))}` : ""}`;
    const c = blankCandidate(`maps-${stableId(text(item.place_id) || text(item.data_id) || sourceUrl)}`, "nearby", text(item.title), sourceUrl);
    c.address = text(item.address);
    c.phone = text(item.phone);
    c.website = safeWebUrl(item.website);
    c.distanceKm = distance;
    const rating = number(item.rating);
    c.rating = rating !== null && rating >= 0 && rating <= 5 ? rating : null;
    const reviews = number(item.reviews);
    c.reviewCount = reviews !== null && reviews >= 0 ? Math.floor(reviews) : null;
    c.snippet = `${text(item.type)}. Potential supplier only; exact fitment, stock and delivery are unconfirmed.`;
    attachPrice(c, web);
    return [c];
  });
  const unique = [...new Map(nearby.map(c => [c.id, c])).values()];
  rankDiscoveredSuppliers(unique, result.radiusKm, settings.currency);
  const top = unique.slice(0, 3).filter(c => c.publishedPrice === null && isSupplierWebsite(c.website));
  await Promise.all(top.map(async candidate => {
    try {
      const data = await search({ engine: "google", q: `site:${websiteHost(candidate.website)} ${request.partName} ${request.model} price`.slice(0, 450), hl: "en", num: "5" });
      attachPrice(candidate, googleListings(data, request));
    } catch { warnings.push(`Published-price check unavailable for ${candidate.name}.`); }
  }));
  result.candidates = [...unique.slice(0, 8), ...web.slice(0, 6)];
  const ranked = rankDiscoveredSuppliers(result.candidates, result.radiusKm, settings.currency);
  result.recommendedCandidateId = ranked.winner?.id ?? null;
  result.recommendation = ranked.explanation;
  result.status = warnings.length ? "partial" : "complete";
  result.fetchedAt = new Date().toISOString();
  result.cacheUntil = new Date(Date.now() + 15 * 60000).toISOString();
  result.note = [
    "Live Google Maps/Search evidence via SerpApi. Nearby results are explicitly filtered by straight-line distance from the resolved location centre, not shop GPS or driving time. These are a limited search sample, not every supplier. Google business price-level symbols are never used as part prices. Exact-part/model snippet prices remain unconfirmed advertisements; missing prices require quotes. Search results are cached for 15 minutes.",
    ...warnings,
  ].join(" ");
  return result;
}

function mapsFrom(data: ObjectValue): ObjectValue[] {
  const results = list(data.local_results);
  const place = object(data.place_results);
  return results.length ? results : place.title ? [place] : [];
}
