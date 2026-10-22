import type { PartRequest, Settings, SupplierDiscovery } from "@workspace/api-zod";
import { audit, ProcurementError, withWorkspace } from "./procurement-store";
import { explainRecommendation } from "./procurement-seed";
import { discoverSuppliers, emptyDiscovery } from "./supplier-discovery";

export const normalizePart = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
export function dailySearchLimit(): number {
  const configured = Number(process.env.LIVE_SUPPLIER_SEARCH_DAILY_LIMIT);
  return Number.isInteger(configured) && configured > 0 ? Math.min(100, configured) : process.env.PROCUREMENT_DEMO_MODE === "true" ? 5 : 20;
}
const locked = (request: PartRequest) => ["approved", "ordered", "delivered", "rejected"].includes(request.status);
type SearchPlan = { request: PartRequest; snapshot?: PartRequest; settings?: Settings; previous?: SupplierDiscovery };

export async function sourcePartRequest(id: number, explicitDiscovery = false): Promise<PartRequest> {
  const plan: SearchPlan = await withWorkspace(state => {
    const request = state.requests.find(r => r.id === id);
    if (!request) throw new ProcurementError("Request not found.", 404);
    if (locked(request)) throw new ProcurementError("This request is locked after a decision. Create a new request for changes.");
    request.inventoryAvailable = state.inventory.filter(i => normalizePart(i.partName) === normalizePart(request.partName) && normalizePart(i.model) === normalizePart(request.model)).reduce((sum, i) => sum + i.quantity, 0);
    for (const entry of state.catalog.filter(c => normalizePart(c.partName) === normalizePart(request.partName) && normalizePart(c.model) === normalizePart(request.model))) {
      if (request.quotes.some(q => q.supplierId === entry.supplierId)) continue;
      const supplier = state.suppliers.find(s => s.id === entry.supplierId);
      if (!supplier) continue;
      const { partName: _part, model: _model, ...quote } = entry;
      request.quotes.push({ ...quote, id: crypto.randomUUID(), supplierName: supplier.name, rating: supplier.rating, score: 0, total: 0, onTime: false, isDemo: supplier.isDemo });
    }
    explainRecommendation(request);
    request.status = request.quotes.some(q => q.available) ? "awaiting_approval" : "sourcing";
    audit(state, "Sourcing checked", `${request.reference}: ${request.inventoryAvailable} stock unit(s), ${request.quotes.length} recorded quotations. Live discovery is separate from confirmed quotations.`, request.id);
    if (!explicitDiscovery && (request.quotes.some(q => q.available) || request.inventoryAvailable >= request.quantity)) {
      if (!request.quotes.length && request.inventoryAvailable >= request.quantity) request.recommendation = "Recorded stock covers the requested quantity. Verify physical stock and fitment before arranging any purchase. No external supplier search was needed.";
      return { request };
    }
    const previous = request.discovery;
    const retryFailedSearch = explicitDiscovery && previous?.status === "failed";
    if (!retryFailedSearch && previous && previous.location === state.settings.searchLocation && previous.radiusKm === state.settings.searchRadiusKm && Date.parse(previous.cacheUntil) > Date.now()) {
      return { request };
    }
    const today = new Date().toISOString().slice(0, 10);
    if (state.liveSearchBudget?.date !== today) state.liveSearchBudget = { date: today, count: 0 };
    if (state.liveSearchBudget!.count >= dailySearchLimit()) {
      request.discovery = previous
        ? { ...previous, status: "partial", cacheUntil: new Date(Date.now() + 120000).toISOString(), note: `${previous.note} Daily search budget reached. Previous evidence is retained; check its observation time or record a confirmed quote manually.` }
        : emptyDiscovery(request, state.settings, "failed", "Daily live-search budget reached. Retry tomorrow or record a supplier-confirmed quote manually. This limit protects the search API's credits.");
      audit(state, "Live search budget reached", `${request.reference}: no provider calls made; ${dailySearchLimit()} search runs/day limit.`, request.id);
      return { request };
    }
    if (!process.env.SERPAPI_API_KEY) {
      request.discovery = emptyDiscovery(request, state.settings, "failed", "Live search is not configured. Add SERPAPI_API_KEY securely, or record a confirmed quote manually.");
      return { request };
    }
    state.liveSearchBudget!.count++;
    request.discovery = emptyDiscovery(request, state.settings, "searching", "Searching Google Maps and exact-part/model listings. No supplier quote has been confirmed yet.");
    return { request, snapshot: structuredClone(request), settings: { ...state.settings }, previous: previous ? structuredClone(previous) : undefined };
  });
  if (!plan.snapshot || !plan.settings) return plan.request;
  const runId = plan.snapshot.discovery!.searchId;
  let result: SupplierDiscovery;
  try {
    result = await discoverSuppliers(plan.snapshot, plan.settings);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Live discovery failed. Try later or record a confirmed quote manually.";
    result = plan.previous?.candidates.length
      ? { ...plan.previous, status: "partial", note: `${message} Previous search evidence is retained; verify its observation time.`, cacheUntil: new Date(Date.now() + 120000).toISOString() }
      : emptyDiscovery(plan.snapshot, plan.settings, "failed", message);
  }
  result.searchId = runId;
  return withWorkspace(state => {
    const current = state.requests.find(r => r.id === id);
    if (!current) throw new ProcurementError("Request not found.", 404);
    if (current.discovery?.searchId !== runId) return current;
    result.preferredCandidateId = plan.previous?.preferredCandidateId && result.candidates.some(c => c.id === plan.previous!.preferredCandidateId) ? plan.previous.preferredCandidateId : null;
    current.discovery = result;
    audit(state, result.status === "failed" ? "Live supplier search failed" : "Live suppliers discovered",
      `${current.reference}: ${result.location}, radius ${result.radiusKm} km. ${result.candidates.filter(c => c.kind === "nearby").length} nearby leads, ${result.candidates.filter(c => c.kind === "web").length} online listings. ${result.note} No quote, purchase or supplier contact was made.`, current.id);
    return current;
  });
}
