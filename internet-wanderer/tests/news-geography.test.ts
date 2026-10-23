import { test } from 'node:test';
import assert from 'node:assert/strict';
import news from '../data/news.snapshot.json' with { type: 'json' };
import { NEWS_REGIONS, globeCoordinates, globePoint, regionForItem, regionItems } from '../src/ui/globe/geography';
import { countryAt } from '../src/ui/globe/country-geography';
import type { WanderItem } from '../src/domain/item-schema';

test('reviewed geography refers to real unchanged news titles with distinct countries and valid coordinates', () => {
  const items = new Map(news.items.map(item => [item.id, item]));
  assert.equal(NEWS_REGIONS.length, 18);
  assert.equal(new Set(NEWS_REGIONS.map(region => region.id)).size, 18);
  for (const region of NEWS_REGIONS) {
    assert.ok(Math.abs(region.longitude) <= 180 && Math.abs(region.latitude) < 90);
    assert.ok(region.items.length >= 3);
    for (const record of region.items) {
      const item = items.get(record.id);
      assert.equal(item?.kind, 'news'); assert.equal(item.title, record.title);
    }
  }
});

test('country filtering never substitutes another country or a publisher office for an indexed report', () => {
  const japan = NEWS_REGIONS.find(region => region.id === 'JP')!;
  const selected = regionItems(japan, news.items as WanderItem[]);
  assert.equal(selected.length, japan.items.length);
  assert.ok(selected.every(item => item.sourceId.startsWith('global-voices')));
  assert.equal(regionForItem(selected[0].id)?.id, 'JP');
  assert.equal(regionForItem('unreviewed-report'), undefined);
  assert.equal(regionItems(japan, []).length, 0);
});

test('sphere texture coordinates round trip and country surface lookup identifies land and oceans', () => {
  for (const [longitude, latitude] of [[0, 0], [138, 37], [-98, 39], [179, -45], [-179, 80]]) {
    const point = globeCoordinates(...globePoint(longitude, latitude));
    assert.ok(Math.abs(point.longitude - longitude) < .00001);
    assert.ok(Math.abs(point.latitude - latitude) < .00001);
  }
  assert.equal(countryAt(138, 37)?.code, 'JP');
  assert.equal(countryAt(-98, 39)?.code, 'US');
  assert.equal(countryAt(26, 27)?.code, 'EG');
  assert.equal(countryAt(-30, 0), undefined);
});
