import geography from '../../../data/news-geography.json' with { type: 'json' };
import type { WanderItem } from '../../domain/item-schema';

export interface NewsRegion {
  id: string; name: string; englishName: string; longitude: number; latitude: number;
  items: { id: string; title: string }[];
}
export const NEWS_REGIONS: NewsRegion[] = geography.regions;

export function regionForItem(id: string) { return NEWS_REGIONS.find(region => region.items.some(item => item.id === id)); }

export function regionItems(region: NewsRegion, items: readonly WanderItem[]) {
  const ids = new Set(region.items.map(item => item.id));
  return items.filter(item => item.kind === 'news' && ids.has(item.id));
}

// Same orientation as Three's equirectangular SphereGeometry (u=0 at longitude -180).
export function globePoint(longitude: number, latitude: number, radius = 1): [number, number, number] {
  const lon = longitude * Math.PI / 180, lat = latitude * Math.PI / 180;
  return [radius * Math.cos(lat) * Math.cos(lon), radius * Math.sin(lat), -radius * Math.cos(lat) * Math.sin(lon)];
}

export function globeCoordinates(x: number, y: number, z: number) {
  const length = Math.hypot(x, y, z);
  return { longitude: -Math.atan2(z, x) * 180 / Math.PI, latitude: Math.asin(y / length) * 180 / Math.PI };
}

