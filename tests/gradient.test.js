import test from "node:test";
import assert from "node:assert/strict";
import {
  gradientSettings,
  gradientVector,
  automaticGradientMode,
} from "../src/gradient.js";
import { project, clearMeasure } from "../src/model.js";
test("Gradient V3 additions normalize and preserve legacy endpoints", () => {
  assert.deepEqual(gradientSettings({ from: "#000000", to: "#ffffff" }), {
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
