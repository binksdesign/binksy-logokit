// Keep every contour and avoid opentype's variadic flattening of complex glyphs.
export function glyphPathData(path) {
  return path.toPathData({decimalPlaces:3,flipY:false,optimize:false});
}
