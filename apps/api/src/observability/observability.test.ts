import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { parseAnalyticsEvent } from './analytics.validation';
import { metricsAccessAllowed } from './observability.guard';
import { ObservabilityService } from './observability.service';
import { normalizeRoute } from './request-telemetry';

describe('stage 13 observability', () => {
  it('normalizes high-cardinality identifiers before recording metrics', () => {
    expect(normalizeRoute('/api/v1/matches/8cc5a85c-a6b4-4758-a649-ba782d4a0691')).toBe(
      '/api/v1/matches/:id',
    );
    expect(normalizeRoute('/api/v1/players/frostbyte/ratings?page=1')).toBe(
      '/api/v1/players/:slug/ratings',
    );
  });

  it('accepts only allow-listed privacy-safe analytics dimensions', () => {
    expect(parseAnalyticsEvent({ name: 'page_view', surface: 'players' })).toEqual({
      name: 'page_view',
      surface: 'players',
    });
    expect(() => parseAnalyticsEvent({ name: 'email_captured', surface: 'players' })).toThrow(
      BadRequestException,
    );
  });

  it('rejects arbitrary analytics properties instead of accepting potential PII', () => {
    expect(() =>
      parseAnalyticsEvent({ name: 'page_view', surface: 'players', email: 'player@example.test' }),
    ).toThrow(BadRequestException);
  });

  it('exports cumulative Prometheus counters and histograms', () => {
    const service = new ObservabilityService();
    service.recordHttp('GET', '/api/v1/players/:slug', 200, 0.08);
    service.recordAnalytics({ name: 'page_view', surface: 'players' });
    const metrics = service.prometheus();
    expect(metrics).toContain('arena_http_requests_total');
    expect(metrics).toContain('le="0.1"} 1');
    expect(metrics).toContain('arena_product_events_total{name="page_view",surface="players"} 1');
  });

  it('requires a bearer token for metrics in production', () => {
    expect(metricsAccessAllowed(undefined, undefined, 'development')).toBe(true);
    expect(metricsAccessAllowed(undefined, undefined, 'production')).toBe(false);
    expect(metricsAccessAllowed('Bearer secret', 'secret', 'production')).toBe(true);
    expect(metricsAccessAllowed('Bearer wrong', 'secret', 'production')).toBe(false);
  });
});
