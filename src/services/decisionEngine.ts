import type { TreatmentPlan, TreatmentStage, WaterReading } from '@/types';
import { THRESHOLDS } from './thresholds';

// Rule-based treatment decision engine.
// Modular: an ML-based engine can replace this later by implementing the same interface.

interface Condition {
  ph: number;
  tds: number;
  turbidity: number;
  temperature: number;
}

export function evaluateTreatment(reading: { ph: number; tds: number; turbidity: number; temperature: number }): TreatmentPlan {
  const { ph, tds, turbidity, temperature } = reading;
  const stages: TreatmentStage[] = [];
  const reasons: string[] = [];

  // Diagnose — always completed
  stages.push({ key: 'raw', label: 'Raw Water', status: 'completed' });
  stages.push({ key: 'diagnose', label: 'Diagnose', status: 'completed' });

  // Sediment filter — needed when turbidity is elevated
  if (turbidity > THRESHOLDS.turbidity.safe) {
    stages.push({ key: 'sediment', label: 'Sediment Filter', status: 'active' });
    reasons.push(`High turbidity detected (${turbidity} NTU) → Sediment filtration recommended`);
  } else {
    stages.push({ key: 'sediment', label: 'Sediment Filter', status: 'notRequired' });
  }

  // Activated carbon — needed when iron/odor/organic risk (proxy: iron elevated or pH abnormal)
  const phAbnormal = ph < THRESHOLDS.ph.elevated.min || ph > THRESHOLDS.ph.elevated.max;
  if (phAbnormal) {
    stages.push({ key: 'carbon', label: 'Activated Carbon', status: 'required' });
    reasons.push(`pH deviation detected (${ph}) → Activated carbon filtration recommended`);
  } else {
    stages.push({ key: 'carbon', label: 'Activated Carbon', status: 'notRequired' });
  }

  // Ultrafiltration — needed when turbidity or microbial risk (proxy: turbidity > safe)
  if (turbidity > THRESHOLDS.turbidity.safe) {
    stages.push({ key: 'uf', label: 'Ultrafiltration', status: 'required' });
    reasons.push(`Microbial/suspended matter risk → Ultrafiltration recommended`);
  } else {
    stages.push({ key: 'uf', label: 'Ultrafiltration', status: 'notRequired' });
  }

  // UV disinfection — needed when temperature is warm (microbial growth proxy) or turbidity elevated
  if (temperature > THRESHOLDS.temperature.safe.max || turbidity > THRESHOLDS.turbidity.safe) {
    stages.push({ key: 'uv', label: 'UV Disinfection', status: 'required' });
    reasons.push(`Microbial risk detected → UV disinfection recommended`);
  } else {
    stages.push({ key: 'uv', label: 'UV Disinfection', status: 'notRequired' });
  }

  // RO — needed only when TDS is high
  if (tds > THRESHOLDS.tds.elevated) {
    stages.push({ key: 'ro', label: 'RO', status: 'required' });
    reasons.push(`High TDS detected (${tds} mg/L) → RO assessment required`);
  } else {
    stages.push({ key: 'ro', label: 'RO', status: 'notRequired' });
  }

  // Verify & accept/reject — always pending until treatment runs
  stages.push({ key: 'verify', label: 'Verify', status: 'required' });
  stages.push({ key: 'accept', label: 'Accept / Reject', status: 'required' });

  return { stages, reasons };
}

export function getTreatmentConditions(reading: WaterReading): { label: string; value: string; level: string }[] {
  const phRisk = reading.ph < THRESHOLDS.ph.elevated.min || reading.ph > THRESHOLDS.ph.elevated.max
    ? reading.ph < THRESHOLDS.ph.high.min || reading.ph > THRESHOLDS.ph.high.max ? 'HIGH' : 'ELEVATED'
    : 'NORMAL';
  const tdsRisk = reading.tds > THRESHOLDS.tds.elevated
    ? reading.tds > THRESHOLDS.tds.high ? 'HIGH' : 'ELEVATED'
    : 'NORMAL';
  const turbRisk = reading.turbidity > THRESHOLDS.turbidity.elevated
    ? reading.turbidity > THRESHOLDS.turbidity.high ? 'HIGH' : 'ELEVATED'
    : 'NORMAL';

  return [
    { label: 'pH', value: reading.ph.toFixed(2), level: phRisk },
    { label: 'TDS', value: `${reading.tds} mg/L`, level: tdsRisk },
    { label: 'Turbidity', value: `${reading.turbidity} NTU`, level: turbRisk },
    { label: 'Temperature', value: `${reading.temperature} °C`, level: 'NORMAL' },
  ];
}
