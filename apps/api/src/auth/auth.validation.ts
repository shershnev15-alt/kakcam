import { BadRequestException } from '@nestjs/common';
import type { EmailTokenInput, LoginInput, RegistrationInput } from './auth.types';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function objectBody(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Тело запроса должно быть объектом');
  }
  return value as Record<string, unknown>;
}

export function normalizeEmail(value: unknown): string {
  if (typeof value !== 'string') throw new BadRequestException('Укажите email');
  const email = value.trim().toLocaleLowerCase('en-US');
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    throw new BadRequestException('Некорректный email');
  }
  return email;
}

export function parseRegistration(value: unknown): RegistrationInput {
  const body = objectBody(value);
  const email = normalizeEmail(body.email);
  if (
    typeof body.password !== 'string' ||
    body.password.length < 12 ||
    body.password.length > 128
  ) {
    throw new BadRequestException('Пароль должен содержать от 12 до 128 символов');
  }
  if (typeof body.displayName !== 'string') throw new BadRequestException('Укажите имя');
  const displayName = body.displayName.trim();
  if (displayName.length < 2 || displayName.length > 60) {
    throw new BadRequestException('Имя должно содержать от 2 до 60 символов');
  }
  return { email, password: body.password, displayName };
}

export function parseLogin(value: unknown): LoginInput {
  const body = objectBody(value);
  const email = normalizeEmail(body.email);
  if (typeof body.password !== 'string' || body.password.length < 1 || body.password.length > 128) {
    throw new BadRequestException('Укажите пароль');
  }
  return { email, password: body.password };
}

export function parseEmailToken(value: unknown): EmailTokenInput {
  const body = objectBody(value);
  if (typeof body.token !== 'string') throw new BadRequestException('Укажите код подтверждения');
  const token = body.token.trim();
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) {
    throw new BadRequestException('Некорректный код подтверждения');
  }
  return { token };
}
