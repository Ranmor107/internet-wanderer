import { z } from 'zod';
import index from '../../data/news-topics.json' with { type: 'json' };
import type { WanderItem } from './item-schema';

export const NEWS_TOPIC_IDS = ['entertainment', 'military', 'technology', 'humanities', 'society', 'environment', 'business', 'sports'] as const;
export type NewsTopic = typeof NEWS_TOPIC_IDS[number];
export type NewsTopicFilter = NewsTopic | 'all';
export const NEWS_TOPICS: { id: NewsTopic; name: string }[] = [
  { id: 'entertainment', name: '娱乐' }, { id: 'military', name: '军事' },
  { id: 'technology', name: '科技' }, { id: 'humanities', name: '人文' },
  { id: 'society', name: '社会' }, { id: 'environment', name: '环境' },
  { id: 'business', name: '财经' }, { id: 'sports', name: '体育' },
];

export const newsTopicIndexSchema = z.object({
  schemaVersion: z.literal(1),
  reviewedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  basis: z.string().min(1),
  items: z.array(z.object({
    id: z.string().min(1), title: z.string().min(1),
    topics: z.array(z.enum(NEWS_TOPIC_IDS)).min(1).refine(topics => new Set(topics).size === topics.length, 'Duplicate topics'),
  })).refine(items => new Set(items.map(item => item.id)).size === items.length, 'Duplicate topic index IDs'),
});
const reviewed = new Map(newsTopicIndexSchema.parse(index).items.map(record => [record.id, record]));

/** Editorial associations survive snapshot refreshes; changed titles need another review. */
export function topicsForItem(item: WanderItem): readonly NewsTopic[] {
  const record = reviewed.get(item.id);
  return item.kind === 'news' && record?.title === item.title ? record.topics : [];
}

export function newsInTopic(items: readonly WanderItem[], topic: NewsTopicFilter): WanderItem[] {
  return items.filter(item => item.kind === 'news' && (topic === 'all' || topicsForItem(item).includes(topic)));
}

export function newsTopicName(topic: NewsTopicFilter) {
  return topic === 'all' ? '全部' : NEWS_TOPICS.find(option => option.id === topic)!.name;
}
