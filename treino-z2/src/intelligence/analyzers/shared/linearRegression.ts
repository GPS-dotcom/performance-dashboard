export interface LinearRegressionResult {
  slope: number;
  rSquared: number;
}

/** Ordinary least-squares linear regression: y = slope*x + intercept (intercept discarded -- only slope/fit matter to trend classification). */
export function linearRegression(points: { x: number; y: number }[]): LinearRegressionResult {
  const n = points.length;
  const meanX = points.reduce((s, p) => s + p.x, 0) / n;
  const meanY = points.reduce((s, p) => s + p.y, 0) / n;

  let ssXY = 0;
  let ssXX = 0;
  let ssYY = 0;
  for (const p of points) {
    ssXY += (p.x - meanX) * (p.y - meanY);
    ssXX += (p.x - meanX) ** 2;
    ssYY += (p.y - meanY) ** 2;
  }

  const slope = ssXX === 0 ? 0 : ssXY / ssXX;
  const rSquared = ssXX === 0 || ssYY === 0 ? 0 : (ssXY * ssXY) / (ssXX * ssYY);
  return { slope, rSquared };
}
