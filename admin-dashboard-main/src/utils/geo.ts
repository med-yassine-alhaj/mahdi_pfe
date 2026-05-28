export type GeoPoint = { lat: number; lng: number };

/**
 * Ray-casting algorithm — returns true if `point` is inside `polygon`.
 * Returns true when polygon has fewer than 3 vertices (no restriction).
 */
export function pointInPolygon(point: GeoPoint, polygon: GeoPoint[]): boolean {
  if (polygon.length < 3) return true;
  let inside = false;
  const x = point.lng;
  const y = point.lat;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat;
    const xj = polygon[j].lng, yj = polygon[j].lat;
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Bounding box of a polygon — used for map centering and restriction. */
export function computeZoneBounds(zone: GeoPoint[]) {
  const lats = zone.map((p) => p.lat);
  const lngs = zone.map((p) => p.lng);
  return {
    north: Math.max(...lats),
    south: Math.min(...lats),
    east: Math.max(...lngs),
    west: Math.min(...lngs),
  };
}

/** Geographic centroid of a polygon — used as default map center. */
export function zoneCentroid(zone: GeoPoint[]): GeoPoint {
  if (zone.length === 0) return { lat: 36.742173, lng: 10.036566 };
  return {
    lat: zone.reduce((s, p) => s + p.lat, 0) / zone.length,
    lng: zone.reduce((s, p) => s + p.lng, 0) / zone.length,
  };
}
