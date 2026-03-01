const axios = require('axios');
const { performance } = require('perf_hooks');

async function testPerformance() {
  const baseURL = 'http://localhost:3000';
  
  const endpoints = [
    '/api/categories',
    '/api/products/featured?limit=8'
  ];

  console.log('--- API Performance Test (Console) ---');
  
  for (const endpoint of endpoints) {
    console.log(`Testing ${endpoint}...`);
    const start = performance.now();
    try {
      const response = await axios.get(`${baseURL}${endpoint}`, { timeout: 30000 });
      const end = performance.now();
      console.log(`[DONE] ${endpoint}: ${(end - start).toFixed(2)}ms (Status: ${response.status})`);
    } catch (error) {
      const end = performance.now();
      console.log(`[FAIL] ${endpoint}: ${(end - start).toFixed(2)}ms (${error.message})`);
    }
  }
}

testPerformance().catch(console.error);
