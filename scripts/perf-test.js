const axios = require('axios');
const { performance } = require('perf_hooks');
const fs = require('fs');

async function testPerformance() {
  const baseURL = 'http://localhost:3000';
  
  const endpoints = [
    '/api/categories',
    '/api/products/featured?limit=8'
  ];

  let results = '--- API Performance Test ---\n';
  
  for (const endpoint of endpoints) {
    const start = performance.now();
    try {
      const response = await axios.get(`${baseURL}${endpoint}`);
      const end = performance.now();
      results += `${endpoint}: ${(end - start).toFixed(2)}ms (Status: ${response.status}, Success: ${response.data.success})\n`;
    } catch (error) {
      const end = performance.now();
      results += `${endpoint}: ${(end - start).toFixed(2)}ms (ERROR: ${error.message})\n`;
    }
  }
  
  fs.writeFileSync('perf_results.txt', results);
  console.log('Results written to perf_results.txt');
}

testPerformance().catch(console.error);
