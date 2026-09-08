import test from "node:test";
import assert from "node:assert/strict";
import { project, layout, History, filename, family } from "../src/model.js";
const fixture = () => {
  const p = project();
  p.assets.icon = {
    box: { width: 100, height: 100 },
    centroid: { x: 0.3, y: 0.3 },
  };
  p.assets.wordmark = {
    box: { width: 400, height: 100 },
    centroid: { x: 0.5, y: 0.5 },
  };
  return p;
};
test("X, horizontal, vertical and standalone bounds", () => {
  const p = fixture();
  assert.equal(layout(p).X, 50);
  assert.equal(layout(p).width, 575);
  assert.equal(layout(p, "vertical").height, 275);
  assert.equal(layout(p, "icon").width, 125);
  assert.equal(layout(p, "wordmark").width, 400);
  p.compositions.horizontal.clear = 5;
  assert.equal(layout(p).width, 575);
  p.compositions.horizontal.wordSize = 2;
  assert.equal(layout(p).X, 100);
});
test("optical center and manual offsets remain deterministic", () => {
  const p = fixture();
  const real = layout(p).parts[0].y;
  p.compositions.horizontal.center = "optical";
  const optical = layout(p).parts[0].y;
  assert.notEqual(real, optical);
  p.compositions.horizontal.iconY = 0.25;
  assert.equal(layout(p).parts[0].y, optical + 12.5);
});
test("undo and redo restore independent state", () => {
  let p = fixture();
  const h = new History();
  h.push(p);
  p.compositions.horizontal.gap = 3;
  p = h.undo(p);
  assert.equal(p.compositions.horizontal.gap, 1);
  p = h.redo(p);
  assert.equal(p.compositions.horizontal.gap, 3);
});
test("family and safe naming", () => {
  const p = fixture();
  assert.equal(family(p).length, 12);
  p.brand = "Étude / Écho";
  assert.equal(
    filename(p, family(p)[0], "svg", "transparent"),
    "etude-echo-horizontal-original-transparent.svg",
  );
  p.enabled = ["icon"];
  assert.equal(family(p).length, 3);
});
