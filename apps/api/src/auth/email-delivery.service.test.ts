import { afterEach, describe, expect, it, vi } from 'vitest';
import { EmailDeliveryService } from './email-delivery.service';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('EmailDeliveryService', () => {
  it('sends a verification link through Resend without exposing the token in headers', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_key');
    vi.stubEnv('EMAIL_FROM', 'cyberID <verify@example.test>');
    vi.stubEnv('PUBLIC_WEB_URL', 'https://cyberid.example');
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'email_123' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      new EmailDeliveryService().sendVerification('player@example.test', 'secret-token'),
    ).resolves.toEqual({ deliveryId: 'email_123' });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers.Authorization).toBe('Bearer re_test_key');
    expect(init.headers['Idempotency-Key']).not.toContain('secret-token');
    expect(JSON.parse(init.body)).toMatchObject({
      from: 'cyberID <verify@example.test>',
      to: ['player@example.test'],
    });
    expect(JSON.parse(init.body).text).toContain(
      'https://cyberid.example/verify-email?token=secret-token',
    );
  });

  it('returns a preview token only outside production when no provider is configured', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('EMAIL_DELIVERY_ENDPOINT', '');
    await expect(
      new EmailDeliveryService().sendVerification('player@example.test', 'preview'),
    ).resolves.toEqual({ previewToken: 'preview' });
  });
});
