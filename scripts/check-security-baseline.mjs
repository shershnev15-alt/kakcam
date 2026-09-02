import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const required = {
  'apps/web/next.config.ts': [
    'Content-Security-Policy',
    'Permissions-Policy',
    'Referrer-Policy',
    'X-Content-Type-Options',
    'X-Frame-Options',
  ],
  'apps/admin/next.config.ts': ['Content-Security-Policy', 'X-Robots-Tag', 'X-Frame-Options'],
  'apps/api/src/main.ts': ['helmet({', 'strictTransportSecurity', 'createRequestTelemetry'],
  'infrastructure/docker/api.Dockerfile': ['--chown=node:node', 'USER node'],
  'infrastructure/docker/web.Dockerfile': ['--chown=node:node', 'USER node'],
  'infrastructure/docker/admin.Dockerfile': ['--chown=node:node', 'USER node'],
};
const failures = [];

for (const [file, tokens] of Object.entries(required)) {
  const content = readFileSync(join(root, file), 'utf8');
  for (const token of tokens) {
    if (!content.includes(token)) failures.push(`${file}: отсутствует ${token}`);
  }
}

const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root })
  .toString('utf8')
  .split('\0')
  .filter(Boolean)
  .filter((file) => !['.png', '.jpg', '.jpeg', '.gif', '.woff', '.woff2'].includes(extname(file)));
const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /AKIA[0-9A-Z]{16}/,
  /sk_live_[0-9a-zA-Z]{20,}/,
  /ghp_[0-9A-Za-z]{30,}/,
];
for (const file of tracked) {
  let content;
  try {
    content = readFileSync(join(root, file), 'utf8');
  } catch {
    continue;
  }
  if (secretPatterns.some((pattern) => pattern.test(content))) {
    failures.push(`${file}: обнаружена строка, похожая на секрет`);
  }
}

if (failures.length) {
  process.stderr.write(`Security baseline failed:\n- ${failures.join('\n- ')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Security baseline passed: headers + ${tracked.length} tracked files checked.\n`,
  );
}
