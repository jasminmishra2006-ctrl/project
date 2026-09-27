// Centralized, configurable thresholds for all water quality parameters.
// Adjust these values to tune the risk classification across the dashboard.

export const THRESHOLDS = {
  ph: {
    safe: { min: 6.5, max: 8.5 },
    elevated: { min: 6.0, max: 9.0 },
    high: { min: 5.5, max: 9.5 },
    // critical: below 5.5 or above 9.5
  },
  tds: {
    safe: 500,
    elevated: 1000,
    high: 1500,
    // critical: above 1500
  },
  turbidity: {
    safe: 5,
    elevated: 10,
    high: 25,
    // critical: above 25
  },
  temperature: {
    safe: { min: 20, max: 30 },
    elevated: { min: 15, max: 35 },
    high: { min: 10, max: 40 },
  },
  iron: {
    safe: 0.3,
    elevated: 0.5,
    high: 1.0,
  },
  arsenic: {
    safe: 0.01,
    elevated: 0.05,
    high: 0.1,
  },
  fluoride: {
    safe: 1.0,
    elevated: 1.5,
    high: 2.0,
  },
  calcium: {
    safe: 75,
    elevated: 100,
    high: 150,
  },
  phosphorus: {
    safe: 0.5,
    elevated: 1.0,
    high: 2.0,
  },
} as const;

export type ThresholdConfig = typeof THRESHOLDS;
