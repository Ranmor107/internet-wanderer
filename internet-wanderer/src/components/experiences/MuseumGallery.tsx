import type { WanderItem } from '../../domain/item-schema';
import ItemCard from '../ItemCard';

export function exhibitionItems(items: WanderItem[]) {
  const rank = (item: WanderItem) => item.kind === 'archive' ? 0 : item.history?.role === 'place' ? 2 : 1;
  return [...items].sort((a, b) => rank(a) - rank(b));
}

export default function MuseumGallery({ items, sequence }: { items: WanderItem[]; sequence: number }) {
  return <div className="museum-gallery result-enter" key={sequence} aria-label="互联网年代展厅" data-testid="museum-gallery">{exhibitionItems(items).map((item, index) => <div className={`museum-exhibit ${index === 0 ? 'exhibit-lead' : 'exhibit-side'} exhibit-${item.history?.role ?? item.kind}`} key={item.id}><ItemCard item={item} index={index} compact /></div>)}</div>;
}
