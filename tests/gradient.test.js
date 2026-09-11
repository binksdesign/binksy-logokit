import test from "node:test";
import assert from "node:assert/strict";
import {
  gradientSettings,
  updateGradient,
  gradientVector,
  automaticGradientMode,
} from "../src/gradient.js";
import { project, clearMeasure, History } from "../src/model.js";
test("Gradient V3 additions normalize and preserve legacy endpoints", () => {
  assert.deepEqual(gradientSettings({ from: "#000000", to: "#ffffff" }), {
    paint: "both", strokeOpacity: 1, excludedTargets: [],
    mode: "global",
    stops: [
      { offset: 0, color: "#000000" },
      { offset: 1, color: "#ffffff" },
    ],
    excludedRoles: [],
  });
  const g = gradientSettings({
    mode: "shape",
    from: "#000000",
    to: "#ffffff",
    stops: [
      { offset: 2, color: "#FF0000" },
      { offset: -1, color: "#00FF00" },
    ],
    excludedRoles: ["paint-a", "bad<>"],
  });
  assert.equal(g.mode, "shape");
  assert.deepEqual(g.stops, [
    { offset: 0, color: "#00ff00" },
    { offset: 1, color: "#ff0000" },
  ]);
  assert.deepEqual(g.excludedRoles, ["paint-a"]);
});
test("Global coordinate field traverses the whole painted box", () => {
  assert.deepEqual(gradientVector({ x: 20, y: 10, width: 300, height: 100 }), {
    x1: 20,
    y1: 60,
    x2: 320,
    y2: 60,
  });
  const v = gradientVector({ x: 20, y: 10, width: 300, height: 100 }, 90);
  assert.ok(Math.abs(v.y1 - 10) < 1e-10);
  assert.ok(Math.abs(v.y2 - 110) < 1e-10);
});
test("Automatic gradient follows explicit imported per-shape geometry", () => {
  assert.equal(
    automaticGradientMode({
      hasGradient: true,
      svg: '<linearGradient gradientUnits="objectBoundingBox"/>',
    }),
    "shape",
  );
  assert.equal(
    automaticGradientMode({ hasGradient: false, svg: "" }),
    "global",
  );
});
test("New kit defaults and automatic ready clearspace do not require configuration", () => {
  const p = project("ready");
  p.ready = [
    { id: "v-test", asset: { box: { x: 0, y: 0, width: 300, height: 80 } } },
  ];
  p.active = "v-test";
  p.compositions["v-test"] = p.compositions.horizontal;
  assert.deepEqual(p.exports.formats, ["svg", "png", "jpeg", "pdf"]);
  assert.equal(clearMeasure(p).space, 40);
  p.compositions["v-test"].references.wordmarkHeight = 30;
  assert.equal(clearMeasure(p).space, 15);
});

test("New projects enable canvas grid and protection guides", () => {
  for (const mode of ["compose", "ready"]) {
    assert.equal(project(mode).grid, true);
    assert.equal(project(mode).clear, true);
  }
});

test("Shared gradient updates preserve identity boundaries and undo/redo", () => {
  let p = project();
  const original = { id: "g-a", name: "A", from: "#123456", to: "#abcdef" };
  const other = { ...original, id: "g-b" };
  p.gradients = [original, other];
  p.selectedDescriptors = Object.fromEntries(
    ["horizontal", "vertical", "icon"].map((variant) => [
      variant,
      { color: { gradient: structuredClone(original) } },
    ]),
  );
  const history = new History();
  history.push(p);
  updateGradient(p, {
    ...original,
    mode: "shape",
    angle: 45,
    excludedRoles: ["paint-a"],
    stops: [
      { offset: 0, color: "#000000" },
      { offset: 0.35, color: "#ff5500" },
      { offset: 1, color: "#ffffff" },
    ],
  });
  for (const item of Object.values(p.selectedDescriptors))
    assert.equal(item.color.gradient, p.gradients[0]);
  assert.deepEqual(p.gradients[1], other);
  assert.equal(p.gradients[0].stops[1].offset, 0.35);
  assert.equal(p.gradients[0].angle, 45);
  assert.equal(p.gradients[0].mode, "shape");
  assert.deepEqual(p.gradients[0].excludedRoles, ["paint-a"]);
  p = history.undo(p);
  assert.deepEqual(p.gradients[0], original);
  p = history.redo(p);
  assert.equal(p.selectedDescriptors.icon.color.gradient, p.gradients[0]);
  assert.equal(p.gradients[0].stops.length, 3);
});
