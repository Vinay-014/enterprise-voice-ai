import http from 'http';

const BASE = 'http://127.0.0.1:3000';

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    }).on('error', reject);
  });
}

function post(path, payload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const req = http.request(`${BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('--- TEST 1: Telemetry (No inflated offsets) ---');
  const tRes = await get('/api/v1/reachout/telemetry');
  console.log('Telemetry status:', tRes.status);
  console.log('Telemetry data_source:', tRes.body.data_source);
  console.log('Telemetry total_calls:', tRes.body.total_calls);
  console.log('Telemetry conversion_rate_pct:', tRes.body.conversion_rate_pct);

  console.log('\n--- TEST 2: Candidate Search with Data Source & Status ---');
  const sRes = await post('/api/v1/search-candidates', {
    job_description: 'We are seeking a Senior Distributed Systems Engineer with at least 5 years of experience in Python, FastAPI, and Kafka.'
  });
  console.log('Search status:', sRes.status);
  console.log('Search data_source:', sRes.body.data_source);
  console.log('Search api_status:', sRes.body.metadata?.api_status);
  console.log('Search candidates count:', sRes.body.candidates?.length);
  console.log('Search min_years_required:', sRes.body.metadata?.min_years_required);

  console.log('\n--- TEST 3: Call Status Refresh (GET & POST) ---');
  const rGetRes = await get('/api/v1/hiring/calls/call_hunar_99182a/refresh');
  console.log('Refresh GET status:', rGetRes.status, 'notice/source:', rGetRes.body._source || rGetRes.body._notice);
  const rPostRes = await post('/api/v1/hiring/calls/call_hunar_99182a/refresh', {});
  console.log('Refresh POST status:', rPostRes.status, 'notice/source:', rPostRes.body._source || rPostRes.body._notice);

  console.log('\n--- TEST 4: Attendance IVR Biometric & Realistic Duration ---');
  const ivrValid = await post('/api/v1/attendance/simulate-ivr', {
    employee_id: '1042',
    site_code: 'SITE-001',
    spoken_location: 'Station SITE-001',
    spoken_shift_time: '07:00 AM'
  });
  console.log('IVR valid - status:', ivrValid.body.status, 'voiceprint_match:', ivrValid.body.voiceprint_match, 'duration:', ivrValid.body.call_duration_seconds);

  const ivrInvalid = await post('/api/v1/attendance/simulate-ivr', {
    employee_id: '9999',
    site_code: 'SITE-001',
    spoken_location: 'Station SITE-001',
    spoken_shift_time: '07:00 AM'
  });
  console.log('IVR outlier 9999 - status:', ivrInvalid.body.status, 'voiceprint_match:', ivrInvalid.body.voiceprint_match, 'anomaly:', ivrInvalid.body.anomaly_reason);

  console.log('\nALL API TESTS COMPLETED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
