#!/usr/bin/env node

const config = {
  public: {
    base: process.env.PUBLIC_WEB_URL ?? 'http://localhost:3000',
    endpoints: ['/', '/players', '/rankings/players', '/privacy', '/about', '/methodology'],
  },
  admin: {
    base: process.env.ADMIN_WEB_URL ?? 'http://localhost:3001',
    endpoints: ['/', '/audit', '/account'],
  },
  api: {
    base: process.env.API_URL ?? 'http://localhost:4000',
    endpoints: ['/health', '/ready', '/api/v1'],
  },
};

const timeoutMs = Number.parseInt(process.env.STAGE14_SMOKE_TIMEOUT_MS ?? '10000', 10);
const metricsToken = process.env.METRICS_TOKEN?.trim();

const urls = [
  ...config.public.endpoints.map((path) => ({ name: `public${path}`, url: `${config.public.base}${path}`, expectOk: true })),
  ...config.admin.endpoints.map((path) => ({
    name: `admin${path}`,
    url: `${config.admin.base}${path}`,
    acceptStatuses: [200, 301, 302, 307, 401, 403],
  })),
  ...config.api.endpoints.map((path) => ({ name: `api${path}`, url: `${config.api.base}${path}`, expectOk: true, parseHealth: path === '/health' })),
  ...(
    metricsToken
      ? [{ name: 'api/metrics', url: `${config.api.base}/metrics`, expectStatus: 200, parseMetrics: true }]
      : []
  ),
];

async function check(target) {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const fetchOptions = { signal: controller.signal, redirect: 'manual', headers: {} };
  if (target.name === 'api/metrics' && metricsToken) {
    fetchOptions.headers.Authorization = `Bearer ${metricsToken}`;
  }

  try {
    const response = await fetch(target.url, fetchOptions);
    clearTimeout(timer);

    const expectedStatuses = target.acceptStatuses;
    const expectedStatus = target.expectStatus ?? (target.expectOk ?? true ? 200 : 307);
    if (expectedStatuses && !expectedStatuses.includes(response.status)) {
      return {
        name: target.name,
        url: target.url,
        ok: false,
        status: response.status,
        statusText: response.statusText,
        ms: Date.now() - start,
      };
    }
    if (!expectedStatuses && response.status !== expectedStatus) {
      return {
        name: target.name,
        url: target.url,
        ok: false,
        status: response.status,
        statusText: response.statusText,
        ms: Date.now() - start,
      };
    }

    if (target.parseHealth) {
      const payload = await response.text();
      if (!/status/.test(payload)) {
        return {
          name: target.name,
          url: target.url,
          ok: false,
          status: response.status,
          statusText: 'unexpected body',
          ms: Date.now() - start,
        };
      }
    }

    if (target.parseMetrics) {
      const payload = await response.text();
      if (!payload.includes('arena_http_requests_total') || !payload.includes('# HELP')) {
        return {
          name: target.name,
          url: target.url,
          ok: false,
          status: response.status,
          statusText: 'unexpected metrics format',
          ms: Date.now() - start,
        };
      }
    }

    return {
      name: target.name,
      url: target.url,
      ok: true,
      status: response.status,
      statusText: response.statusText,
      ms: Date.now() - start,
    };
  } catch (error) {
    return {
      name: target.name,
      url: target.url,
      ok: false,
      status: 0,
      statusText: error?.name === 'AbortError' ? `timeout (${timeoutMs}ms)` : String(error),
      ms: Date.now() - start,
    };
  }
}

const results = await Promise.all(urls.map(check));

const failed = results.filter((r) => !r.ok);
for (const result of results) {
  const status = result.ok ? 'OK' : 'FAIL';
  console.log(`${status} | ${result.name} | ${result.url} | ${result.status} ${result.statusText} | ${result.ms}ms`);
}

if (failed.length > 0) {
  console.error(`\nStage 14 smoke failed for ${failed.length} target(s).`);
  process.exitCode = 1;
} else {
  console.log('\nStage 14 smoke passed.');
  process.exitCode = 0;
}
