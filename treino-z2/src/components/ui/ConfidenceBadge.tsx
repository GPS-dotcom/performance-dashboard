import { Badge } from "./Badge";

/** The "X% confidence" badge repeated across recommendations, insights and predictions -- one implementation instead of three. */
export function ConfidenceBadge({ confidence }: { confidence: number }) {
  return <Badge variant="info">{Math.round(confidence * 100)}% confidence</Badge>;
}
