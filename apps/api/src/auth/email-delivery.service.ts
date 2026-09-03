import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'node:crypto';

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    };
    return entities[character]!;
  });
}

@Injectable()
export class EmailDeliveryService {
  async sendVerification(
    email: string,
    token: string,
  ): Promise<{ previewToken?: string; deliveryId?: string }> {
    const verifyUrl = new URL(
      '/verify-email',
      process.env.PUBLIC_WEB_URL ?? 'http://localhost:3000',
    );
    verifyUrl.searchParams.set('token', token);
    const resendApiKey = process.env.RESEND_API_KEY?.trim();
    if (resendApiKey) {
      const sender = process.env.EMAIL_FROM?.trim();
      if (!sender) throw new ServiceUnavailableException('EMAIL_FROM не настроен');
      const safeUrl = escapeHtml(verifyUrl.toString());
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `verify-${createHash('sha256').update(token).digest('hex')}`,
          'User-Agent': 'cyberid-api/1.0',
        },
        body: JSON.stringify({
          from: sender,
          to: [email],
          subject: 'Подтвердите email в cyberID',
          html: `<h1>Подтверждение email</h1><p>Завершите регистрацию игрока по защищённой ссылке:</p><p><a href="${safeUrl}">Подтвердить email</a></p><p>Ссылка действует 24 часа. Если вы не создавали аккаунт, проигнорируйте письмо.</p>`,
          text: `Подтвердите email в cyberID: ${verifyUrl.toString()}\n\nСсылка действует 24 часа.`,
          tags: [{ name: 'category', value: 'email_verification' }],
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new ServiceUnavailableException('Письмо не отправлено');
      const result = (await response.json()) as { id?: string };
      return result.id ? { deliveryId: result.id } : {};
    }

    const endpoint = process.env.EMAIL_DELIVERY_ENDPOINT;
    if (endpoint) {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.EMAIL_DELIVERY_TOKEN
            ? { Authorization: `Bearer ${process.env.EMAIL_DELIVERY_TOKEN}` }
            : {}),
        },
        body: JSON.stringify({
          to: email,
          template: 'verify-email',
          locale: 'ru',
          variables: { token, verifyUrl: verifyUrl.toString() },
        }),
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) throw new ServiceUnavailableException('Письмо не отправлено');
      const result = (await response.json().catch(() => null)) as { id?: string } | null;
      return result?.id ? { deliveryId: result.id } : {};
    }

    if (process.env.NODE_ENV === 'production') {
      throw new ServiceUnavailableException('Провайдер email не настроен');
    }
    return { previewToken: token };
  }
}
