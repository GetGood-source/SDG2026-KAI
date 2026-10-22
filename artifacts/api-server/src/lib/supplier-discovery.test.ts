import { test } from "node:test";
import assert from "node:assert/strict";
import { discoverSuppliers } from "./supplier-discovery";
import { seedState } from "./procurement-seed";

test("live response mapping filters distance and unsafe URLs, preserves review evidence and never creates a quote", async t => {
  // Test-only credentials and provider responses; no real API calls or stored evidence.
  const previous = process.env.SERPAPI_API_KEY;
  process.env.SERPAPI_API_KEY = "test-only-not-a-real-provider-key";
  t.after(() => { if (previous === undefined) delete process.env.SERPAPI_API_KEY; else process.env.SERPAPI_API_KEY = previous; });
  t.mock.method(globalThis, "fetch", async (value: URL | string | Request) => {
    const url = new URL(String(value));
    let payload: unknown;
    if (url.searchParams.get("q") === "Test-only search centre") {
      payload = { place_results: { title: "Test city", gps_coordinates: { latitude: 3.1, longitude: 101.6 } } };
    } else if (url.searchParams.get("engine") === "google_maps") {
      payload = { local_results: [
        { title: "TEST FIXTURE Parts Shop", place_id: "fixture-local", gps_coordinates: { latitude: 3.11, longitude: 101.6 }, rating: 4.7, reviews: 60, website: "https://parts.example.com" },
        { title: "TEST FIXTURE Outside radius", place_id: "fixture-far", gps_coordinates: { latitude: 4, longitude: 102 }, rating: 5, reviews: 100 },
        { title: "TEST FIXTURE Unknown coordinates", rating: 5, reviews: 100 },
      ] };
    } else {
      payload = { organic_results: [
        { title: "Alternator Toyota Vios 2019", snippet: "Advertised listing RM 285.00", link: "https://parts.example.com/alternator" },
        { title: "Alternator Toyota Vios variant unspecified", snippet: "RM420.00", link: "https://other-parts.example.com/unspecified" },
        { title: "Unsafe result", link: "javascript:alert(1)" },
      ] };
    }
    return new Response(JSON.stringify(payload), { status: 200 });
  });
  const state = seedState();
  const request = { ...state.requests[0]!, partName: "Alternator", model: "Toyota Vios 2019", quotes: [] };
  const result = await discoverSuppliers(request, { ...state.settings, searchLocation: "Test-only search centre" });
  assert.equal(result.status, "complete");
  assert.equal(result.candidates.filter(c => c.kind === "nearby").length, 1);
  assert.equal(result.candidates.filter(c => c.kind === "web").length, 2);
  const unspecified = result.candidates.find(c => c.name === "other-parts.example.com")!;
  assert.equal(unspecified.publishedPrice, null);
  assert.match(unspecified.priceText, /RM420.00 advertised/);
  const local = result.candidates.find(c => c.kind === "nearby")!;
  assert.equal(local.rating, 4.7);
  assert.equal(local.reviewCount, 60);
  assert.ok(local.distanceKm! < 25);
  assert.equal(local.publishedPrice, 285);
  assert.equal(local.priceCurrency, "MYR");
  assert.equal(result.recommendedCandidateId, local.id);
  assert.equal(request.quotes.length, 0);
  assert.match(result.recommendation, /not a confirmed purchasing recommendation/);
});

test("provider authentication failures are explicit and do not leak response bodies", async t => {
  const previous = process.env.SERPAPI_API_KEY;
  process.env.SERPAPI_API_KEY = "test-only-not-a-real-provider-key";
  t.after(() => { if (previous === undefined) delete process.env.SERPAPI_API_KEY; else process.env.SERPAPI_API_KEY = previous; });
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ error: "DO_NOT_PROPAGATE_PROVIDER_BODY" }), { status: 401 }));
  const state = seedState();
  await assert.rejects(discoverSuppliers(state.requests[0]!, { ...state.settings, searchLocation: "Test authentication failure location" }), error => {
    assert.ok(error instanceof Error);
    assert.match(error.message, /HTTP 401/);
    assert.doesNotMatch(error.message, /DO_NOT_PROPAGATE|test-only-not-a-real/);
    return true;
  });
});
