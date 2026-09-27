import historyCsv from '@shared/data/waterQualityHistory.csv?raw';

const REQUIRED_HEADERS = [
  'sample_id', 'sample_date', 'city', 'state', 'latitude', 'longitude', 'pH',
  'tds_mg_l', 'turbidity_ntu', 'temperature_c', 'demo_water_status',
];
const PARAMETER_COLUMNS = {
  ph: 'pH',
  tds: 'tds_mg_l',
  turbidity: 'turbidity_ntu',
  temperature: 'temperature_c',
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }

  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function parseNumber(value) {
  if (value === undefined || value === null || value.trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function isValidSample(sample) {
  const dateIsValid = /^\d{4}-\d{2}-\d{2}$/.test(sample.sample_date)
    && Number.isFinite(Date.parse(`${sample.sample_date}T00:00:00Z`));
  const coordinatesAreValid = sample.latitude !== null && sample.latitude >= -90 && sample.latitude <= 90
    && sample.longitude !== null && sample.longitude >= -180 && sample.longitude <= 180;
  const parametersAreValid = Object.values(PARAMETER_COLUMNS).every((column) => sample[column] !== null);
  return Boolean(sample.sample_id && sample.city && sample.state && dateIsValid && coordinatesAreValid && parametersAreValid);
}

const [headerRow = [], ...dataRows] = parseCsv(historyCsv.trim());
const headers = headerRow.map((header) => header.trim().replace(/^\uFEFF/, ''));
const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header));

if (missingHeaders.length > 0) {
  throw new Error(`Historical water dataset is missing required columns: ${missingHeaders.join(', ')}`);
}

const columnIndex = Object.fromEntries(headers.map((header, index) => [header, index]));
const parsedRows = dataRows.map((row) => Object.fromEntries(headers.map((header) => [header, (row[columnIndex[header]] ?? '').trim()])))
  .map((row) => ({
    ...row,
    latitude: parseNumber(row.latitude),
    longitude: parseNumber(row.longitude),
    pH: parseNumber(row.pH),
    tds_mg_l: parseNumber(row.tds_mg_l),
    turbidity_ntu: parseNumber(row.turbidity_ntu),
    temperature_c: parseNumber(row.temperature_c),
    hardness_mg_l_as_caco3: parseNumber(row.hardness_mg_l_as_caco3),
    residual_free_chlorine_mg_l: parseNumber(row.residual_free_chlorine_mg_l),
    ammonia_mg_l: parseNumber(row.ammonia_mg_l),
    fluoride_mg_l: parseNumber(row.fluoride_mg_l),
    nitrate_mg_l: parseNumber(row.nitrate_mg_l),
    e_coli_cfu_100ml: parseNumber(row.e_coli_cfu_100ml),
    fecal_coliform_cfu_100ml: parseNumber(row.fecal_coliform_cfu_100ml),
  }));

const historicalSamples = parsedRows.filter(isValidSample);
if (historicalSamples.length !== parsedRows.length) {
  console.warn(`Skipped ${parsedRows.length - historicalSamples.length} invalid historical water sample(s).`);
}

export function getHistoryCities() {
  return [...new Set(historicalSamples.map((sample) => sample.city))].sort();
}

export function getHistoricalSampleCount(city = 'All Cities') {
  return city === 'All Cities' ? historicalSamples.length : historicalSamples.filter((sample) => sample.city === city).length;
}

export function getHistoricalTrends(city = 'All Cities') {
  const filteredSamples = (city === 'All Cities' ? historicalSamples : historicalSamples.filter((sample) => sample.city === city))
    .slice()
    .sort((first, second) => first.sample_date.localeCompare(second.sample_date));
  const groupedByDate = new Map();

  filteredSamples.forEach((sample) => {
    const samplesForDate = groupedByDate.get(sample.sample_date) ?? [];
    samplesForDate.push(sample);
    groupedByDate.set(sample.sample_date, samplesForDate);
  });

  return [...groupedByDate.entries()].map(([date, samples]) => {
    const [, month, day] = date.split('-').map(Number);
    const trend = {
      date,
      time: `${MONTHS[month - 1]} ${day}`,
      sampleCount: samples.length,
      cities: [...new Set(samples.map((sample) => sample.city))].join(', '),
    };
    Object.entries(PARAMETER_COLUMNS).forEach(([parameter, column]) => {
      const values = samples.map((sample) => sample[column]).filter(Number.isFinite);
      trend[parameter] = values.length
        ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2))
        : null;
    });
    return trend;
  });
}

function mapSourceStatusToRisk(status) {
  switch (status?.trim().toLowerCase()) {
    case 'good':
    case 'safe':
    case 'normal':
      return 'safe';
    case 'monitor':
    case 'elevated':
      return 'elevated';
    case 'high':
      return 'high';
    case 'critical':
    case 'unsafe':
    case 'poor':
      return 'critical';
    default:
      return 'nodata';
  }
}

export function getHistoricalMapRecords() {
  return historicalSamples.map((sample) => ({
    ...sample,
    sampleId: sample.sample_id,
    ph: sample.pH,
    tds: sample.tds_mg_l,
    turbidity: sample.turbidity_ntu,
    temperature: sample.temperature_c,
    riskLevel: mapSourceStatusToRisk(sample.demo_water_status),
  }));
}

export function getHistoricalMapCenter() {
  const records = getHistoricalMapRecords();
  if (records.length === 0) return null;
  return [
    records.reduce((sum, record) => sum + record.latitude, 0) / records.length,
    records.reduce((sum, record) => sum + record.longitude, 0) / records.length,
  ];
}
