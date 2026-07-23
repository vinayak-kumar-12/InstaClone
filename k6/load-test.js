import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 100 },   // Warmup to 100 users
    { duration: '1m',  target: 500 },   // Ramp up to 500 users
    { duration: '2m',  target: 1000 },  // Scale up to 1000 users
    { duration: '1m',  target: 5000 },  // Spike test to 5000 users
    { duration: '30s', target: 0 },     // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate must be under 1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost';

export default function () {
  // Test Health Endpoint
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health status is 200': (r) => r.status === 200,
  });

  // Test Frontend Static Asset
  const frontendRes = http.get(`${BASE_URL}/`);
  check(frontendRes, {
    'frontend status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
