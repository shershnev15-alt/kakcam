import { Injectable, ServiceUnavailableException } from '@nestjs/common';

@Injectable()
export class EmailDeliveryService {
  async sendVerification(email: string, token: string): Promise<{ previewToken?: string }> {
    const verifyUrl = `${process.env.PUBLIC_WEB_URL ?? 'http://localhost:3000'}/verify-email`;
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
          variables: { token, verifyUrl },
        }),
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) throw new ServiceUnavailableException('Письмо не отправлено');
      return {};
    }

    if (process.env.NODE_ENV === 'production') {
      throw new ServiceUnavailableException('Провайдер email не настроен');
    }
    return { previewToken: token };
  }
}
