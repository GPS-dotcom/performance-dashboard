// Ordinary least-squares linear regression, shared by every algorithm
// that extrapolates a trend (linearTrendModel, goalProbabilityModel).
// Kept as one implementation for exactly the reason the Metrics and
// Intelligence Engines each keep their own single copy: "Sem regras
// duplicadas."

export interface LinearRegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
  /** Residual standard error -- sqrt(sum of squared residuals / (n-2)), used to derive prediction intervals. Null when n < 3 (undefined degrees of freedom). */
  residualStdError: number | null;
  meanX: number;
  /** Sum of squared deviations of x from its mean -- Sxx, used by the prediction-interval formula. */
  sumSquaredX: number;
  n: number;
}

/** y = slope*x + intercept. */
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
  const intercept = meanY - slope * meanX;
  const rSquared = ssXX === 0 || ssYY === 0 ? 0 : (ssXY * ssXY) / (ssXX * ssYY);

  let residualStdError: number | null = null;
  if (n > 2) {
    const sumSquaredResiduals = points.reduce((s, p) => s + (p.y - (slope * p.x + intercept)) ** 2, 0);
    residualStdError = Math.sqrt(sumSquaredResiduals / (n - 2));
  }

  return { slope, intercept, rSquared, residualStdError, meanX, sumSquaredX: ssXX, n };
}
