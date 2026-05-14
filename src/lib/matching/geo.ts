/**
 * 2 点間の Haversine 距離 (km)。地球を半径 6371 km の球と近似。
 *
 *   km = 2R · asin(sqrt(sin²(Δφ/2) + cos(φ1)·cos(φ2)·sin²(Δλ/2)))
 *
 * 都心の数 km 単位のマッチング精度で十分なため、楕円体補正 (Vincenty 等) は省略。
 */

const EARTH_RADIUS_KM = 6371;

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const aTerm =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;
  const c = 2 * Math.asin(Math.min(1, Math.sqrt(aTerm)));
  return EARTH_RADIUS_KM * c;
}

/**
 * 距離 (km) → 0-100 のスコアに変換。
 * 5km 以下: 満点、10km: 80, 20km: 60, 40km: 30, 80km+: 10。
 * 介護福祉現場の通勤実態に合わせた手当て。
 */
export function distanceToScore(km: number): number {
  if (km <= 5) return 100;
  if (km <= 10) return 90;
  if (km <= 20) return 70;
  if (km <= 40) return 45;
  if (km <= 80) return 20;
  return 10;
}
