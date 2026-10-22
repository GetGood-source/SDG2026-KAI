import { test } from "node:test";
import assert from "node:assert/strict";
import type { SupplierCandidate } from "@workspace/api-zod";
import { distanceKm, hasExactListingEvidence, isSupplierWebsite, publishedPrice, rankDiscoveredSuppliers, safeWebUrl } from "./supplier-search-evidence";

const candidate = (changes: Partial<SupplierCandidate> = {}): SupplierCandidate => ({
  id: "shop", kind: "nearby", name: "Parts Shop", title: "Parts Shop", address: "", phone: "", website: "", sourceUrl: "",
  distanceKm: 3, rating: 4.5, reviewCount: 50, publishedPrice: null, priceCurrency: null, priceText: "Quote required", priceSourceUrl: "",
  snippet: "", score: 0, reason: "", ...changes,
});

test("distance is unrounded for strict radius filtering", () => {
  const center = { latitude: 3.1073, longitude: 101.6067 };
  assert.equal(distanceKm(center, center), 0);
  assert.ok(distanceKm(center, { latitude: 3.333, longitude: 101.6067 }) > 25);
});
test("exact price evidence requires part, model, year, a currency and a single definite price", () => {
  assert.deepEqual(publishedPrice("Toyota Vios 2019 Oxygen sensor RM 285.00", "Oxygen sensor", "Toyota Vios 2019"), { price: 285, currency: "MYR", text: "RM 285.00" });
  for (const snippet of ["Oxygen sensor RM285", "Toyota Vios 2018 Oxygen sensor RM285", "Toyota Vios 2019 Oxygen sensor from RM285", "Toyota Vios 2019 Oxygen sensor RM285-RM350", "Toyota Vios 2019 Oxygen sensor $285", "Toyota Vios 2019 Oxygen sensor RM285 and RM350"]) {
    assert.equal(publishedPrice(snippet, "Oxygen sensor", "Toyota Vios 2019"), null, snippet);
  }
  assert.equal(hasExactListingEvidence("Toyota Vios 2019 Oxygen sensor", "Oxygen sensor", "Toyota Vios 2019"), true);
});
test("unsafe links and marketplace domains cannot establish a local supplier's price identity", () => {
  assert.equal(safeWebUrl("javascript:alert(1)"), "");
  assert.equal(isSupplierWebsite("https://shopee.com.my/a-random-seller"), false);
  assert.equal(isSupplierWebsite("https://parts.example.com"), true);
});
test("ranking excludes outside-radius and unlocated online listings, without guessing unknown reviews/prices", () => {
  const local = candidate({ id: "inside", distanceKm: 4, rating: null, reviewCount: null });
  const outside = candidate({ id: "outside", distanceKm: 30, rating: 5, reviewCount: 1000, publishedPrice: 1, priceCurrency: "MYR" });
  const web = candidate({ id: "web", kind: "web", distanceKm: null, publishedPrice: 1, priceCurrency: "MYR" });
  const ranked = rankDiscoveredSuppliers([local, outside, web], 25, "MYR");
  assert.equal(ranked.winner?.id, "inside");
  assert.equal(local.score, 37.8);
  assert.equal(web.score, 0);
  assert.equal(local.rating, null);
  assert.equal(local.publishedPrice, null);
});
test("review count and currency affect evidence scoring, not recorded facts", () => {
  const oneReview = candidate({ id: "one", rating: 5, reviewCount: 1, publishedPrice: 1, priceCurrency: "USD" });
  const manyReviews = candidate({ id: "many", rating: 4.8, reviewCount: 100, publishedPrice: 300, priceCurrency: "MYR" });
  const result = rankDiscoveredSuppliers([oneReview, manyReviews], 25, "MYR");
  assert.equal(result.winner?.id, "many");
  assert.match(oneReview.reason, /Different currency/);
  assert.ok(manyReviews.score <= 100);
});
