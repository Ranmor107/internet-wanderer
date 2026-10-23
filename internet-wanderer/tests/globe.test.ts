import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ORIGINS, project, shortestTurn, sourceOrigin } from '../src/ui/globe/projection';

test('globe projects the facing hemisphere and keeps publisher markers on land-facing views', () => {
  assert.deepEqual(project(0, 0, 0, 0), { x: 0, y: -0, depth: 1 });
  assert.ok(project(180, 0, 0).depth < 0);
  for (const origin of ORIGINS) {
    const point = project(origin.longitude, origin.latitude, origin.longitude);
    assert.ok(point.depth > .8);
    assert.ok(Math.abs(point.x) < .001);
  }
  assert.equal(shortestTurn(170, -170), 20);
  assert.equal(shortestTurn(-170, 170), -20);
});

test('publisher mapping does not infer geography from language or unknown sources', () => {
  assert.equal(sourceOrigin('global-voices-ja')?.id, 'nl');
  assert.equal(sourceOrigin('nasa')?.id, 'us');
  assert.equal(sourceOrigin('ecb')?.id, 'de');
  assert.equal(sourceOrigin('unknown-ja'), undefined);
});
