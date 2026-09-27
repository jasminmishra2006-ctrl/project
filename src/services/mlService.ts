import type { MLPrediction, WaterReading } from '@/types';
import { THRESHOLDS } from './thresholds';

// Placeholder ML service — ready to connect to a Python/FastAPI backend.
// Currently returns a rule-based DEMO prediction.
// Replace the body of predictWaterQuality with a fetch() call to the real API.

export async function predictWaterQuality(data: {
  ph: number;
  tds: number;
  turbidity: number;
  temperature: number;
}): Promise<MLPrediction> {
  // --- Future implementation ---
  // const res = await fetch(`${ML_API_URL}/predict`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(data),
  // });
  // return res.json();

  // --- Demo rule-based prediction ---
  await new Promise((r) => setTimeout(r, 400));

  const { ph, tds, turbidity } = data;
  let risk = 'LOW';
  let predictedContaminant = 'None';
  let confidence = 85;

  if (tds > THRESHOLDS.tds.elevated) {
    risk = 'HIGH';
    predictedContaminant = 'High TDS';
    confidence = 91;
  } else if (turbidity > THRESHOLDS.turbidity.elevated) {
    risk = 'MODERATE';
    predictedContaminant = 'Iron';
    confidence = 88;
  } else if (ph < THRESHOLDS.ph.elevated.min || ph > THRESHOLDS.ph.elevated.max) {
    risk = 'MODERATE';
    predictedContaminant = 'pH Imbalance';
    confidence = 86;
  } else if (turbidity > THRESHOLDS.turbidity.safe) {
    risk = 'MODERATE';
    predictedContaminant = 'Iron';
    confidence = 82;
  }

  return {
    riskLevel: risk,
    predictedContaminant,
    confidence,
    inputs: data,
    isDemo: true,
  };
}
