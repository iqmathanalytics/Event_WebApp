function averageRgb(pixels) {
  if (!pixels.length) {
    return "rgb(15, 23, 42)";
  }
  let r = 0;
  let g = 0;
  let b = 0;
  for (const [pr, pg, pb] of pixels) {
    r += pr;
    g += pg;
    b += pb;
  }
  const n = pixels.length;
  return `rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})`;
}

/** Average colors along the left and right edges of an image (for banner letterboxing). */
export function sampleImageEdgeColors(img) {
  try {
    if (!img?.naturalWidth || !img?.naturalHeight) {
      return null;
    }

    const sampleW = 48;
    const sampleH = 48;
    const canvas = document.createElement("canvas");
    canvas.width = sampleW;
    canvas.height = sampleH;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      return null;
    }

    ctx.drawImage(img, 0, 0, sampleW, sampleH);

    const left = [];
    const right = [];
    for (let y = 0; y < sampleH; y += 1) {
      const l = ctx.getImageData(0, y, 1, 1).data;
      const r = ctx.getImageData(sampleW - 1, y, 1, 1).data;
      left.push([l[0], l[1], l[2]]);
      right.push([r[0], r[1], r[2]]);
    }

    return {
      left: averageRgb(left),
      right: averageRgb(right)
    };
  } catch {
    return null;
  }
}
