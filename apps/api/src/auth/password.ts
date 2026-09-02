import * as crypto from 'node:crypto';

const MEMORY_KIB = 19_456;
const PASSES = 2;
const PARALLELISM = 1;
const TAG_LENGTH = 32;

type Argon2Options = {
  message: Uint8Array;
  nonce: Uint8Array;
  parallelism: number;
  tagLength: number;
  memory: number;
  passes: number;
};

type Argon2Api = {
  argon2(
    algorithm: 'argon2id',
    options: Argon2Options,
    callback: (error: Error | null, result: Uint8Array) => void,
  ): void;
};

const argon2 = (crypto as unknown as Argon2Api).argon2;

function derive(
  password: string,
  salt: Uint8Array,
  options: Omit<Argon2Options, 'message' | 'nonce'>,
) {
  return new Promise<Buffer>((resolve, reject) => {
    argon2(
      'argon2id',
      { message: Buffer.from(password, 'utf8'), nonce: salt, ...options },
      (error, result) => (error ? reject(error) : resolve(Buffer.from(result))),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const hash = await derive(password, salt, {
    memory: MEMORY_KIB,
    passes: PASSES,
    parallelism: PARALLELISM,
    tagLength: TAG_LENGTH,
  });
  return `$argon2id$v=19$m=${MEMORY_KIB},t=${PASSES},p=${PARALLELISM}$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const match = /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([^$]+)\$([^$]+)$/.exec(encoded);
  if (!match) return false;

  const [, memoryValue, passesValue, parallelismValue, saltValue, hashValue] = match;
  if (!memoryValue || !passesValue || !parallelismValue || !saltValue || !hashValue) return false;

  const memory = Number(memoryValue);
  const passes = Number(passesValue);
  const parallelism = Number(parallelismValue);
  if (
    !Number.isInteger(memory) ||
    !Number.isInteger(passes) ||
    !Number.isInteger(parallelism) ||
    memory < 8_192 ||
    memory > 262_144 ||
    passes < 1 ||
    passes > 10 ||
    parallelism < 1 ||
    parallelism > 16
  ) {
    return false;
  }

  const expected = Buffer.from(hashValue, 'base64url');
  if (expected.length < 16 || expected.length > 64) return false;
  const actual = await derive(password, Buffer.from(saltValue, 'base64url'), {
    memory,
    passes,
    parallelism,
    tagLength: expected.length,
  });
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}
