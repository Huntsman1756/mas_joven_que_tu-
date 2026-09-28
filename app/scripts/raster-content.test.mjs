import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rasterContent } from './raster-content.mjs';
const sample = (pixel) => ({
  width: 256,
  height: 256,
  rgba: Array.from({ length: 4096 }, (_, i) => pixel(i)).flat()
});
test('rejects blank white, gray, transparent, tiny and undecoded responses', () => {
  for (const value of [
    sample(() => [255, 255, 255, 255]),
    sample(() => [120, 120, 120, 255]),
    sample(() => [20, 90, 180, 0]),
    { width: 1, height: 1, rgba: [0, 0, 0, 255] },
    {}
  ])
    assert.equal(rasterContent(value).pass, false);
});
test('accepts a varied opaque control, not a geographic certification', () => {
  assert.equal(
    rasterContent(sample((i) => [i % 256, (i * 13) % 256, (i * 31) % 256, 255])).pass,
    true
  );
});
