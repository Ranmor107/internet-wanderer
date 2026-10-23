import countries from './countries.json' with { type: 'json' };

function inRing(longitude: number, latitude: number, ring: number[][]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > latitude) !== (yj > latitude) && longitude < (xj - xi) * (latitude - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function countryAt(longitude: number, latitude: number) {
  return countries.find(country => {
    const polygons = country.geometry.type === 'Polygon' ? [country.geometry.coordinates as number[][][]] : country.geometry.coordinates as number[][][][];
    return polygons.some(polygon => inRing(longitude, latitude, polygon[0]) && !polygon.slice(1).some(ring => inRing(longitude, latitude, ring)));
  });
}

export function countryRings(id: string): number[][][] {
  const country = countries.find(entry => entry.code === id);
  if (!country) return [];
  const polygons = country.geometry.type === 'Polygon' ? [country.geometry.coordinates as number[][][]] : country.geometry.coordinates as number[][][][];
  return polygons.flatMap(polygon => polygon);
}
