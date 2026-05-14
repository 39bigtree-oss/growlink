import { describe, expect, it } from "vitest";

import { distanceToScore, haversineKm } from "@/lib/matching/geo";

describe("haversineKm", () => {
  it("東京駅 → 大阪駅 ≒ 400 km", () => {
    const tokyo = { lat: 35.681236, lng: 139.767125 };
    const osaka = { lat: 34.702485, lng: 135.495951 };
    const km = haversineKm(tokyo, osaka);
    expect(km).toBeGreaterThan(380);
    expect(km).toBeLessThan(420);
  });

  it("同一点の距離は ≒ 0 km", () => {
    const p = { lat: 35.681236, lng: 139.767125 };
    expect(haversineKm(p, p)).toBeLessThan(0.0001);
  });

  it("東京駅 → 新宿駅 ≒ 5-7 km", () => {
    const tokyo = { lat: 35.681236, lng: 139.767125 };
    const shinjuku = { lat: 35.690921, lng: 139.700258 };
    const km = haversineKm(tokyo, shinjuku);
    expect(km).toBeGreaterThan(5);
    expect(km).toBeLessThan(7);
  });
});

describe("distanceToScore", () => {
  it("5km 以下: 100", () => {
    expect(distanceToScore(0)).toBe(100);
    expect(distanceToScore(5)).toBe(100);
  });
  it("10km 以下: 90", () => {
    expect(distanceToScore(10)).toBe(90);
  });
  it("20km 以下: 70", () => {
    expect(distanceToScore(20)).toBe(70);
  });
  it("80km 超: 10", () => {
    expect(distanceToScore(100)).toBe(10);
    expect(distanceToScore(400)).toBe(10);
  });
});
