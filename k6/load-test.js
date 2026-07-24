import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "2m", target: 5000 },     // Warm up
    { duration: "3m", target: 10000 },    // 10K
    { duration: "3m", target: 20000 },    // 20K
    { duration: "5m", target: 50000 },    // Hold at 50K
    { duration: "2m", target: 0 },        // Ramp down
  ],

  thresholds: {
    http_req_duration: ["p(95)<1000"],
    http_req_failed: ["rate<0.05"],
  },
};

const BASE_URL = "http://localhost:3000";

export default function () {
  const res = http.get(`${BASE_URL}/health`);

  check(res, {
    "Health API": (r) => r.status === 200,
  });

  sleep(1);
}