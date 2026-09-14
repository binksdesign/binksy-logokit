import test from "node:test";
import assert from "node:assert/strict";
import {
  WEB_SIZES,
  normalizeFormats,
  rasterTargets,
  bitmapRect,
  paletteText,
} from "../src/export-formats.js";
import { project } from "../src/model.js";
import { catalog, selectedItem } from "../src/catalog.js";
import { gradientSettings } from "../src/gradient.js";
test("Dimensions, uses and DPI remain independent", () => {
  const e = {
    ...project().exports,
    rasterFormats: ["web-1000", "web-3000", "profile", "story"],
    framing: { profile: 0.4, "web-3000": 0.7 },
  };
  const targets = rasterTargets(e);
  assert.equal(targets.length, 4);
  assert.equal(rasterTargets({...e,printBitmaps:true}).length,6);
  for (const f of targets) {
    assert.equal(f.dpi, f.destination === "PRINT" ? 300 : 72);
    assert.equal(f.destination === "CAS D’USAGE", f.kind === "use");
  }
  assert.equal(targets.find((f) => f.id === "profile").scale, 0.4);
  assert.equal(targets.find((f) => f.id === "story").scale, 0.8);
  assert(
    targets.filter((f) => f.id === "web-3000").every((f) => f.scale === 0.7),
  );
  assert.equal(WEB_SIZES.length, 5);
});
test("Legacy canvas remains a dimension after selection; custom names are required", () => {
  const e = { width: 1600, height: 1200 };
  assert.equal(normalizeFormats(e).selected[0].kind, "web");
  e.rasterFormats = ["legacy-size"];
  assert.equal(normalizeFormats(e).selected[0].width, 1600);
  e.customFormats = [
    { id: "bad", name: "  ", width: 100, height: 100 },
    { id: "good", name: "Header", width: 100, height: 200 },
  ];
  e.rasterFormats = ["bad", "good"];
  assert.deepEqual(
    normalizeFormats(e).selected.map((f) => f.id),
    ["good"],
  );
});
test("Bitmap fitting always preserves center and proportions", () => {
  for (const [w, h] of [
    [1000, 1000],
    [1080, 1920],
    [1500, 500],
  ])
    for (const occupancy of [0.05, 0.4, 0.8, 1]) {
      const r = bitmapRect(w, h, 300, 70, occupancy);
      assert.equal(r.x + r.width / 2, w / 2);
      assert.equal(r.y + r.height / 2, h / 2);
      assert(Math.abs(r.width / r.height - 300 / 70) < 1e-10);
      assert(r.width <= w && r.height <= h);
    }
});
test("TXT contains every palette color and finite CMYK including black", () => {
  const text = paletteText([
    { name: "Black", hex: "#000000" },
    { name: "Orange", hex: "#ff5500" },
  ]);
  assert(
    text.includes("Black") &&
      text.includes("#FF5500") &&
      text.includes("255 / 85 / 0"),
  );
  assert(text.includes("0 / 0 / 0 / 100"));
  assert(!text.includes("NaN"));
});
test("Icon/wordmark combinations separate identical roles using only the palette", () => {
  const p = project();
  const asset = {
    box: { x: 0, y: 0, width: 100, height: 100 },
    roles: [{ id: "same", paint: "#000000", targets: [] }],
  };
  p.assets = { icon: asset, wordmark: asset };
  p.colors = [
    { id: "a", name: "A", hex: "#ff0000" },
    { id: "b", name: "B", hex: "#0000ff" },
  ];
  const c = catalog(p, "horizontal", "multi");
  assert.equal(c.size, 2n);
  for (let i = 0n; i < c.size; i++) {
    const item = c.at(i);
    assert(!selectedItem(p, item));
    assert.deepEqual(
      new Set(Object.values(item.color.partColors)),
      new Set(p.colors.map((c) => c.hex)),
    );
  }
});
test("Gradient stores more than 32 points, stroke opacity and shape exclusions", () => {
  const stops = Array.from({ length: 50 }, (_, i) => ({
    offset: i / 49,
    color: "#ff5500",
  }));
  const g = gradientSettings({
    stops,
    paint: "stroke",
    strokeOpacity: 0,
    excludedTargets: ["icon:2:stroke"],
  });
  assert.equal(g.stops.length, 50);
  assert.equal(g.strokeOpacity, 0);
  assert.equal(g.paint, "stroke");
  assert.deepEqual(g.excludedTargets, ["icon:2:stroke"]);
});
