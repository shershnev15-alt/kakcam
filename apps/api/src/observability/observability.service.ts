import { Injectable } from '@nestjs/common';
import type { AnalyticsEventInput } from './analytics.validation';

const durationBuckets = [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5] as const;

type HttpMetric = {
  count: number;
  durationSeconds: number;
  buckets: number[];
};

@Injectable()
export class ObservabilityService {
  private readonly http = new Map<string, HttpMetric>();
  private readonly analytics = new Map<string, number>();
  private readonly analyticsWindows = new Map<string, { count: number; startedAt: number }>();

  recordHttp(method: string, route: string, statusCode: number, durationSeconds: number): void {
    const key = `${method}|${route}|${statusCode}`;
    const metric = this.http.get(key) ?? {
      count: 0,
      durationSeconds: 0,
      buckets: durationBuckets.map(() => 0),
    };
    metric.count += 1;
    metric.durationSeconds += durationSeconds;
    durationBuckets.forEach((bucket, index) => {
      if (durationSeconds <= bucket) metric.buckets[index] = (metric.buckets[index] ?? 0) + 1;
    });
    this.http.set(key, metric);
  }

  recordAnalytics(event: AnalyticsEventInput): void {
    const key = `${event.name}|${event.surface}`;
    this.analytics.set(key, (this.analytics.get(key) ?? 0) + 1);
  }

  acceptAnalytics(clientHash: string, now = Date.now()): boolean {
    const window = this.analyticsWindows.get(clientHash);
    if (!window || now - window.startedAt >= 60_000) {
      this.analyticsWindows.set(clientHash, { count: 1, startedAt: now });
      return true;
    }
    if (window.count >= 120) return false;
    window.count += 1;
    return true;
  }

  prometheus(): string {
    const lines = [
      '# HELP arena_http_requests_total Total HTTP responses.',
      '# TYPE arena_http_requests_total counter',
      '# HELP arena_http_request_duration_seconds HTTP response duration.',
      '# TYPE arena_http_request_duration_seconds histogram',
    ];
    for (const [key, metric] of [...this.http.entries()].sort(([left], [right]) =>
      left.localeCompare(right),
    )) {
      const [method = 'UNKNOWN', route = 'unknown', status = '0'] = key.split('|');
      const labels = `method="${escapeLabel(method)}",route="${escapeLabel(route)}",status="${escapeLabel(status)}"`;
      lines.push(`arena_http_requests_total{${labels}} ${metric.count}`);
      durationBuckets.forEach((bucket, index) => {
        lines.push(
          `arena_http_request_duration_seconds_bucket{${labels},le="${bucket}"} ${metric.buckets[index] ?? 0}`,
        );
      });
      lines.push(
        `arena_http_request_duration_seconds_bucket{${labels},le="+Inf"} ${metric.count}`,
        `arena_http_request_duration_seconds_sum{${labels}} ${metric.durationSeconds.toFixed(6)}`,
        `arena_http_request_duration_seconds_count{${labels}} ${metric.count}`,
      );
    }
    lines.push(
      '# HELP arena_product_events_total Accepted privacy-safe product analytics events.',
      '# TYPE arena_product_events_total counter',
    );
    for (const [key, count] of [...this.analytics.entries()].sort(([left], [right]) =>
      left.localeCompare(right),
    )) {
      const [name = 'unknown', surface = 'other'] = key.split('|');
      lines.push(
        `arena_product_events_total{name="${escapeLabel(name)}",surface="${escapeLabel(surface)}"} ${count}`,
      );
    }
    return `${lines.join('\n')}\n`;
  }
}

function escapeLabel(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}
