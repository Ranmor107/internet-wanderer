export interface Origin { id: string; name: string; label: string; longitude: number; latitude: number }

// Country-level reference points, not newsroom coordinates or reported event locations.
export const ORIGINS: Origin[] = [
  { id: 'us', name: '美国', label: 'UNITED STATES', longitude: -98, latitude: 39 },
  { id: 'nl', name: '荷兰', label: 'THE NETHERLANDS', longitude: 5, latitude: 52 },
  { id: 'de', name: '德国', label: 'GERMANY', longitude: 10, latitude: 51 },
];

export function sourceOrigin(sourceId: string) {
  const id = sourceId === 'nasa' ? 'us' : sourceId === 'ecb' ? 'de' : sourceId.startsWith('global-voices') ? 'nl' : undefined;
  return ORIGINS.find(origin => origin.id === id);
}

export function project(longitude: number, latitude: number, center: number, tilt = 22) {
  const radians = Math.PI / 180;
  const lon = (longitude - center) * radians, lat = latitude * radians, phi = tilt * radians;
  return {
    x: Math.cos(lat) * Math.sin(lon),
    y: -(Math.cos(phi) * Math.sin(lat) - Math.sin(phi) * Math.cos(lat) * Math.cos(lon)),
    depth: Math.sin(phi) * Math.sin(lat) + Math.cos(phi) * Math.cos(lat) * Math.cos(lon),
  };
}

export function shortestTurn(from: number, to: number) {
  return ((to - from + 540) % 360 + 360) % 360 - 180;
}
