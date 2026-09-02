import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { parseLogin, parseRegistration } from './auth.validation';

describe('auth request validation', () => {
  it('normalizes registration data', () => {
    expect(
      parseRegistration({
        email: '  User@Example.COM ',
        password: 'long-secure-password',
        displayName: '  Arena User ',
      }),
    ).toEqual({
      email: 'user@example.com',
      password: 'long-secure-password',
      displayName: 'Arena User',
    });
  });

  it('requires a 12-character password for registration', () => {
    expect(() =>
      parseRegistration({ email: 'user@example.com', password: 'short', displayName: 'User' }),
    ).toThrow(BadRequestException);
  });

  it('does not reveal account existence while parsing login', () => {
    expect(parseLogin({ email: 'USER@example.com', password: 'x' })).toEqual({
      email: 'user@example.com',
      password: 'x',
    });
  });
});
