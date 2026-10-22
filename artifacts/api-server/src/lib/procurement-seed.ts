import type { Workspace, PartRequest, Quote, QuoteInput } from "@workspace/api-zod";

export type CatalogEntry = QuoteInput & { partName: string; model: string };
export type ProcurementState = Workspace & { catalog: CatalogEntry[] };

export function rankQuotes(request: PartRequest): void {
  const available = request.quotes.filter(q => q.available);
  const min = Math.min(...available.map(q => q.price * request.quantity + q.shipping));
  for (const q of request.quotes) {
    q.total = Math.round((q.price * request.quantity + q.shipping) * 100) / 100;
    q.onTime = Date.now() + q.leadHours * 3600000 <= new Date(request.neededBy).getTime();
    q.score = q.available
      ? Math.round((50 * min / q.total + 30 * q.rating / 5 + (q.onTime ? 20 : 0)) * 10) / 10
      : 0;
  }
  request.quotes.sort((a, b) => b.score - a.score || a.total - b.total);
}

export function explainRecommendation(request: PartRequest): void {
  rankQuotes(request);
  const eligible = request.quotes.filter(q => q.available);
  const winner = eligible[0];
  request.selectedQuoteId = winner?.id ?? null;
  request.recommendationMode = "rules";
  if (!winner) {
    request.recommendation = "No available recorded quote matches this exact part and model. Search Google for external suppliers and record a confirmed quotation before requesting approval. No prices or ratings have been guessed.";
    return;
  }
  request.recommendation = `${winner.supplierName} is recommended with ${winner.score}/100. Scoring: price 50% (lowest available landed cost ÷ this quote's landed cost), supplier rating 30% (rating ÷ 5), delivery 20% (meets required date). Total for ${request.quantity} unit(s) including shipping: ${winner.total.toFixed(2)}. Rating: ${winner.rating}/5. Lead time: ${winner.leadHours} hours. ${winner.onTime ? "Estimated delivery meets the requested deadline." : "Warning: estimated delivery misses the deadline. Confirm an alternative arrangement before approval."} Unavailable quotes are excluded. ${winner.isDemo ? "This is a sample quote, not a live supplier offer." : "Price is based on a manually recorded quote; reconfirm availability before placing the order."}`;
}

export function seedState(): ProcurementState {
  const now = Date.now();
  const state: ProcurementState = {
    settings: { companyName: "AutoCare Workshop", industry: "Automotive", currency: "MYR" },
    suppliers: [
      { id: 1, name: "AutoParts Direct", email: "sales@autoparts.example", category: "Automotive", rating: 4.8, leadHours: 6, location: "Petaling Jaya", isDemo: true },
      { id: 2, name: "MotorPro Supply", email: "sales@motorpro.example", category: "Automotive", rating: 4.6, leadHours: 24, location: "Shah Alam", isDemo: true },
      { id: 3, name: "Precision Auto Trading", email: "sales@precision.example", category: "Automotive", rating: 4.9, leadHours: 4, location: "Kuala Lumpur", isDemo: true },
    ],
    inventory: [
      { id: 1, partName: "Front brake pads", model: "Toyota Vios 2019", quantity: 0, minimum: 2, location: "Shelf A-01" },
      { id: 2, partName: "Oil filter", model: "Perodua Myvi 2020", quantity: 8, minimum: 4, location: "Shelf B-03" },
      { id: 3, partName: "Spark plugs", model: "Honda City 2021", quantity: 2, minimum: 4, location: "Shelf A-04" },
    ],
    requests: [], activity: [],
    summary: { activeRequests: 0, pendingApprovals: 0, inTransit: 0, totalSpend: 0, lowStock: 0, delivered: 0, savings: 0 },
    demoMode: true,
    integrationNote: "Shared MVP workspace. Sample suppliers and quotations are labeled Demo. Google search opens externally; record verified quotes manually. Follow-ups are drafts, not sent emails. Purchase orders are tracked internally, not submitted to suppliers. Human names in the log are entered labels, not verified identities.",
    catalog: [],
  };
  const samples = [
    { partName: "Front brake pads", model: "Toyota Vios 2019", prices: [145, 128, 168], status: "awaiting_approval", priority: "urgent", by: "Amir", hours: 18 },
    { partName: "Oxygen sensor", model: "Honda Civic 2018", prices: [285, 260, 310], status: "sourcing", priority: "normal", by: "Sarah", hours: 48 },
    { partName: "Alternator", model: "Perodua Myvi 2020", prices: [480, 445, 520], status: "ordered", priority: "critical", by: "Daniel", hours: 30 },
    { partName: "Spark plugs", model: "Honda City 2021", prices: [85, 78, 95], status: "delivered", priority: "normal", by: "Amir", hours: 72 },
    { partName: "Cabin air filter", model: "Proton X50 2022", prices: [65, 58, 72], status: "new", priority: "normal", by: "Sarah", hours: 96 },
  ] as const;
  samples.forEach((s, i) => {
    const r: PartRequest = {
      id: i + 1, reference: `PR-${String(1041 + i)}`, partName: s.partName, model: s.model,
      neededBy: new Date(now + s.hours * 3600000).toISOString(),
      description: i === 0 ? "Front axle brake pads. Customer vehicle in bay 2. OEM-equivalent quality required; confirm fitment before purchase." : "Replacement part for scheduled workshop repair. Confirm model compatibility and warranty.",
      requestedBy: s.by, quantity: i === 3 ? 4 : 1, priority: s.priority, status: s.status,
      createdAt: new Date(now - (i + 1) * 3600000).toISOString(), quotes: [],
      selectedQuoteId: null, orderReference: s.status === "ordered" || s.status === "delivered" ? `PO-${2084 + i}` : null,
      recommendation: "", recommendationMode: "rules",
      searchUrl: `https://www.google.com/search?q=${encodeURIComponent(s.partName + " " + s.model + " supplier Malaysia")}`,
      inventoryAvailable: i === 3 ? 2 : 0,
    };
    s.prices.forEach((price, j) => {
      const supplier = state.suppliers[j]!;
      const input: QuoteInput = { supplierId: supplier.id, price, shipping: j === 1 ? 15 : 10, leadHours: supplier.leadHours, available: true, sourceUrl: "" };
      state.catalog.push({ ...input, partName: s.partName, model: s.model });
      if (s.status !== "new") {
        r.quotes.push({ ...input, id: `q-${r.id}-${supplier.id}`, supplierName: supplier.name, rating: supplier.rating, score: 0, total: 0, onTime: true, isDemo: true } as Quote);
      }
    });
    explainRecommendation(r);
    state.requests.push(r);
    state.activity.push({
      id: i + 1, action: s.status === "ordered" ? "Purchase order recorded" : s.status === "delivered" ? "Delivery received" : "Request created",
      detail: `${r.reference} · ${r.partName} · ${r.model} (sample workflow)`,
      actor: s.by, createdAt: r.createdAt, requestId: r.id,
    });
  });
  return state;
}
