import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('Argon2id password storage', () => {
  it('hashes and verifies a password without storing the plaintext', async () => {
    const encoded = await hashPassword('correct horse battery staple');

    expect(encoded).toMatch(/^\$argon2id\$v=19\$/);
    expect(encoded).not.toContain('correct horse');
    await expect(verifyPassword('correct horse battery staple', encoded)).resolves.toBe(true);
    await expect(verifyPassword('wrong password', encoded)).resolves.toBe(false);
  });

  it('rejects malformed stored values', async () => {
    await expect(verifyPassword('anything', 'not-a-hash')).resolves.toBe(false);
  });
});
