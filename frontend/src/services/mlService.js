const MODEL_FEATURES = [
  'pH',
  'tds_mg_l',
  'turbidity_ntu',
  'temperature_c',
  'hardness_mg_l_as_caco3',
  'residual_free_chlorine_mg_l',
  'ammonia_mg_l',
  'fluoride_mg_l',
  'nitrate_mg_l',
  'e_coli_cfu_100ml',
  'fecal_coliform_cfu_100ml',
];

const FRONTEND_TO_MODEL = {
  pH: 'ph',
  tds_mg_l: 'tds',
  turbidity_ntu: 'turbidity',
  temperature_c: 'temperature',
  hardness_mg_l_as_caco3: 'hardness_mg_l_as_caco3',
  residual_free_chlorine_mg_l: 'residual_free_chlorine_mg_l',
  ammonia_mg_l: 'ammonia_mg_l',
  fluoride_mg_l: 'fluoride',
  nitrate_mg_l: 'nitrate_mg_l',
  e_coli_cfu_100ml: 'e_coli_cfu_100ml',
  fecal_coliform_cfu_100ml: 'fecal_coliform_cfu_100ml',
};

/** Map fields present in the existing reading schema; absent features stay null. */
export function mapSensorReadingToModelInput(reading) {
  return Object.fromEntries(MODEL_FEATURES.map((feature) => {
    const sourceKey = FRONTEND_TO_MODEL[feature];
    const value = reading?.[sourceKey];
    return [feature, typeof value === 'number' && Number.isFinite(value) ? value : null];
  }));
}

export async function predictWaterQuality(reading, sourceLabel = 'Unknown source') {
  const baseUrl = import.meta.env.VITE_ML_API_URL?.trim().replace(/\/$/, '');
  if (!baseUrl) {
    throw new Error('ML service is not configured. Set VITE_ML_API_URL in the frontend environment.');
  }

  const inputs = mapSensorReadingToModelInput(reading);
  const missingFeatures = MODEL_FEATURES.filter((feature) => inputs[feature] === null);
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 10000);
  let response;
  try {
    response = await fetch(`${baseUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...inputs, ...(reading?.sensor_id ? { sensor_id: reading.sensor_id } : {}) }),
      signal: abortController.signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('ML prediction timed out after 10 seconds.');
    throw new Error('ML service is unavailable. Check the service URL and that the service is running.');
  } finally {
    clearTimeout(timeoutId);
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof body.detail === 'string' ? body.detail : `ML service returned HTTP ${response.status}.`;
    throw new Error(detail);
  }
  if (typeof body.prediction !== 'number' || typeof body.confidence !== 'number' || !body.probability) {
    throw new Error('ML service returned an incomplete prediction response.');
  }

  return {
    ...body,
    confidencePercent: body.confidence * 100,
    inputs,
    features_missing: body.features_missing ?? missingFeatures,
    sourceLabel,
  };
}
