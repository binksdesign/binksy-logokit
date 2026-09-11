import test from 'node:test';
import assert from 'node:assert/strict';
import { project, layout, variantIds, variantName, uniqueVariantName, clearMeasure, History, filename } from '../src/model.js';
import { catalog } from '../src/catalog.js';
const fixture = () => {
  const p = project();
  const asset = { box: { x: 0, y: 0, width: 180, height: 80 }, centroid: {x:.5,y:.5}, roles: [] };
  p.assets.icon = asset; p.assets.wordmark = asset;
  p.ready.push({id:'v-badge', name:'Badge', asset});
  p.compositions['v-badge'] = structuredClone(p.compositions.horizontal);
  p.enabled.push('v-badge'); p.active = 'v-badge';
  return p;
};
test('Mixed variants share discovery, catalogs and custom filenames without recomposition', () => {
  const p = fixture();
  assert.equal(variantIds(p).length, 5);
  assert.equal(variantName(p,'v-badge'), 'Badge');
  const before = layout(p);
  Object.assign(p.compositions['v-badge'], {gap:5,iconHeight:900,wordmarkHeight:800,align:'end',iconX:8});
  assert.deepEqual(layout(p), before);
  assert.equal(catalog(p,'v-badge','original').size,1n);
  assert.equal(layout(p,'horizontal').parts.length,2);
  assert.match(filename(p,{variant:'v-badge',color:{id:'original'}},'svg','transparent'), /badge/);
});
test('Ready clearspace ignores compose assets and keeps per-variant history', () => {
  let p=fixture(); const h=new History();
  assert.equal(clearMeasure(p).value,80);
  for (const n of [.5,1,1.5,2]) {
    h.push(p); p.compositions['v-badge'].clearMultiplier=n;
    assert.equal(clearMeasure(p).space,80*n);
    p=h.redo(h.undo(p)); assert.equal(clearMeasure(p).space,80*n);
    assert.equal(p.compositions.horizontal.clearMultiplier,.5);
  }
});
test('Names disambiguate generated names, accents, punctuation and duplicate variants', () => {
  const p=fixture();
  assert.equal(uniqueVariantName(p,'Bádge!'), 'Bádge! 2');
  assert.equal(uniqueVariantName(p,'Horizontal'), 'Horizontal 2');
  assert.equal(uniqueVariantName(p,'Badge','v-badge'),'Badge');
});
