// One crop model for cover, mockups and custom image elements, in preview and PDF.
export function imageFrame(media, resource, box) {
  const fit = media.fit === 'contain' ? Math.min : Math.max;
  const rw = resource.width || box.w, rh = resource.height || box.h;
  const scale = fit(box.w / rw, box.h / rh) * (media.zoom || 1);
  const w = rw * scale, h = rh * scale;
  return { x: box.x + (box.w - w) * (media.panX ?? .5), y: box.y + (box.h - h) * (media.panY ?? .5), w, h };
}
export const resetCrop = (media) => Object.assign(media, { zoom: 1, panX: .5, panY: .5 });

// Relative positions reflow photos without changing aspect ratio or image data.
export function arrangeImages(page, format) {
  const images = page.elements.filter((e) => e.type === "image"),
    portrait = format === "portrait";
  const left = 0.06,
    top = portrait ? 0.16 : 0.24,
    width = 0.88,
    height = portrait ? 0.73 : 0.63,
    gap = 0.025;
  images.forEach((e, i) => {
    if (page.layout === "image" && ["cover", "end"].includes(page.type)) {
      Object.assign(e, { x: 0.53, y: 0.17, w: 0.41, h: 0.68 });
      return;
    }
    if (page.layout === "full") {
      Object.assign(e, { x: left, y: top, w: width, h: height });
      return;
    }
    const columns =
      page.layout === "three"
        ? 3
        : page.layout === "two" || page.layout === "mixed"
          ? 2
          : portrait
            ? 1
            : 2;
    if (page.layout === "mixed" && i < 2) {
      Object.assign(e, {
        x: left + (i ? width * 0.65 + gap : 0),
        y: top,
        w: i ? width * 0.35 - gap : width * 0.65,
        h: i ? height * 0.6 : height,
      });
      return;
    }
    const rows = Math.ceil(images.length / columns),
      w = (width - gap * (columns - 1)) / columns,
      h = (height - gap * (rows - 1)) / rows;
    Object.assign(e, {
      x: left + (i % columns) * (w + gap),
      y: top + Math.floor(i / columns) * (h + gap),
      w,
      h,
    });
  });
}
