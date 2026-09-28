/** Reject undecoded, tiny, transparent and spatially uniform samples.
 * Diversity is not proof of geographic correctness: retain the image for review.
 */
export function rasterContent({ width, height, rgba }) {
  if (width < 64 || height < 64 || !rgba?.length || rgba.length % 4)
    return { pass: false, reason: 'dimensions_or_decode' };
  let opaque = 0;
  let sum = 0;
  let sum2 = 0;
  const colors = new Set();
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] < 240) continue;
    opaque++;
    const y = (rgba[i] + rgba[i + 1] + rgba[i + 2]) / 3;
    sum += y;
    sum2 += y * y;
    colors.add(`${rgba[i] >> 4},${rgba[i + 1] >> 4},${rgba[i + 2] >> 4}`);
  }
  const opaqueRatio = opaque / (rgba.length / 4);
  const variance = opaque ? sum2 / opaque - (sum / opaque) ** 2 : 0;
  return {
    pass: opaqueRatio >= 0.9 && variance >= 25 && colors.size >= 12,
    opaqueRatio,
    variance,
    colors: colors.size,
    width,
    height
  };
}
