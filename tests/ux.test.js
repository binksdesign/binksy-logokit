import test from "node:test";
import assert from "node:assert/strict";
import {
  project,
  layout,
  clearMeasure,
  variantIds,
  colors,
  History,
  jpegPairs,
} from "../src/model.js";
import {
  catalog,
  selectedCount,
  selectedItems,
  setCategory,
  CATEGORIES,
} from "../src/catalog.js";
import { measureSquare, copyClearRule } from "../src/visual-measure.js";
const fixture = () => {
  const p = project("clearspace");
  p.ready = [
    {
      id: "v-a",
      name: "A",
      asset: { box: { width: 200, height: 100 }, roles: [] },
    },
  ];
  p.active = "v-a";
  p.enabled = ["v-a"];
  p.compositions["v-a"] = structuredClone(p.compositions.horizontal);
  return p;
};
test("Clear-space-only mode reuses assembled geometry and exposes originals only", () => {
  const p = fixture();
  assert.deepEqual(variantIds(p), ["v-a"]);
  assert.equal(layout(p).width, 200);
  assert.equal(clearMeasure(p).value, 100);
  p.colors = [{ id: "red", name: "red", hex: "#ff0000" }];
  assert.equal(colors(p).length, 1);
  for (const cat of ["mono", "multi", "gradient"])
    assert.equal(catalog(p, "v-a", cat).size, 0n);
  setCategory(p, p.enabled, CATEGORIES, "all");
  assert.equal(selectedItems(p).length, 1);
});
test("Visual squares stay square in four directions and snap without changing aspect ratio", () => {
  for (const [x, y] of [
    [40, 10],
    [-40, 10],
    [10, -40],
    [-10, -40],
  ]) {
    const q = measureSquare({ x: 0, y: 0 }, { x, y });
    assert.equal(q.size, 40);
    assert.equal(q.x, x < 0 ? -40 : 0);
    assert.equal(q.y, y < 0 ? -40 : 0);
  }
  assert.equal(
    measureSquare({ x: 0, y: 0 }, { x: 39, y: 17 }, [{ x: 40, y: 80 }], 2).size,
    40,
  );
  assert.equal(measureSquare({ x: 0, y: 0 }, { x: 39, y: 17 }, [], 2).size, 39);
});
test("Named visual measurements persist independently of logo bounds and through history", () => {
  let p = fixture();
  const h = new History();
  h.push(p);
  Object.assign(p.compositions["v-a"], {
    clearMethod: "visual",
    visualMeasure: { value: 23.75, label: "hauteur du M" },
    clearMultiplier: 1.5,
  });
  assert.equal(clearMeasure(p).space, 35.625);
  assert.equal(clearMeasure(p).label, "hauteur du M");
  assert.equal(layout(p).width, 200);
  p = h.undo(p);
  assert.equal(clearMeasure(p).value, 100);
  p = h.redo(p);
  assert.equal(clearMeasure(p).value, 23.75);
  const target = { minDigital: 40 };
  copyClearRule(p.compositions["v-a"], target);
  target.visualMeasure.label = "autre";
  assert.equal(clearMeasure(p).label, "hauteur du M");
  assert.equal(target.minDigital, 40);
});
test("Automatic, component-based and visual measurements remain separate", () => {
  const p = fixture(),
    c = p.compositions["v-a"];
  c.references.wordmarkHeight = 17;
  assert.equal(clearMeasure(p).value, 17);
  c.clearMethod = "auto";
  assert.equal(clearMeasure(p).value, 100);
  c.clearMethod = "part";
  assert.equal(clearMeasure(p).value, 17);
  c.clearMethod = "visual";
  c.visualMeasure = { value: 22, label: "eye" };
  assert.equal(clearMeasure(p).value, 22);
});
test("JPEG new exceptions override shared choices without changing legacy precedence", () => {
  const p = fixture();
  p.mode = "ready";
  const item = catalog(p, p.active, "original").at(0n);
  const id = item.id + ":jpeg:white";
  p.jpegOverrides[id] = false;
  p.jpegGlobal["original:jpeg:white"] = true;
  assert.equal(jpegPairs(p, item).find((x) => x.id === id).enabled, true);
  p.jpegExceptions[id] = false;
  assert.equal(jpegPairs(p, item).find((x) => x.id === id).enabled, false);
});
test("Legacy individual exclusions are reflected in the selection count", () => {
  const p = fixture();
  p.excluded = ["v-a:original"];
  assert.equal(selectedCount(p, "v-a", "original"), 0n);
  assert.equal(selectedItems(p).length, 0);
});
