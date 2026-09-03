'use client';

import { useEffect, useState } from 'react';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

type ModerationCase = {
  id: string;
  status: string;
  priority: number;
  createdAt: string;
  claim: {
    id: string;
    status: string;
    method: string;
    statement: string | null;
    player: { slug: string; nickname: string };
    claimant: { email: string; displayName: string | null };
    identityStatus: string | null;
    evidence: Array<{
      id: string;
      kind: string;
      reference: string;
      checksum: string;
      contentUrl?: string;
      file?: { contentType: string; byteSize: number; scanStatus: string; originalName: string };
    }>;
  };
};

export function ModerationPanel() {
  const [cases, setCases] = useState<ModerationCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [reason, setReason] = useState('Доказательства проверены модератором cyberID');
  const [status, setStatus] = useState('OPEN');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void fetch(`${apiUrl}/moderation/claims?status=${status}`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.status === 401) throw new Error('Войдите в аккаунт модератора.');
        if (response.status === 403) throw new Error('У аккаунта нет права claim.review.');
        if (!response.ok) throw new Error('Не удалось загрузить очередь.');
        return (await response.json()) as { data: ModerationCase[] };
      })
      .then((result) => setCases(result.data))
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setMessage(cause instanceof Error ? cause.message : 'Не удалось загрузить очередь.');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [status]);

  async function decide(claimId: string, decision: string) {
    setMessage(null);
    const response = await fetch(`${apiUrl}/moderation/claims/${claimId}/decision`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, reason }),
    });
    const result = (await response.json()) as { message?: string | string[] };
    if (!response.ok) {
      setMessage(
        Array.isArray(result.message)
          ? result.message.join(', ')
          : (result.message ?? 'Не удалось сохранить решение.'),
      );
      return;
    }
    setCases((current) => current.filter((item) => item.claim.id !== claimId));
    setMessage(`Решение ${decision} сохранено в audit log.`);
  }

  if (loading) return <p className="muted py-16 text-center">Загружаем moderation queue…</p>;

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Stage 7 operations</p>
          <h1 className="mt-2 text-4xl font-black tracking-[-.04em]">Модерация claims</h1>
          <p className="muted mt-3">
            Evidence остаётся ограниченным, каждое решение фиксируется в AuditLog.
          </p>
        </div>
        <label className="surface-soft grid gap-1 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)]">
          Очередь
          <select
            className="bg-transparent text-sm font-bold text-[var(--text-1)]"
            onChange={(event) => setStatus(event.target.value)}
            value={status}
          >
            <option value="OPEN">Новые · {status === 'OPEN' ? cases.length : ''}</option>
            <option value="WAITING_EVIDENCE">Ждём исправления</option>
            <option value="RESOLVED">Завершённые</option>
          </select>
        </label>
      </div>

      <label className="mt-8 grid gap-2 text-sm font-semibold">
        Основание решения
        <input
          className="focus-ring h-11 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3"
          onChange={(event) => setReason(event.target.value)}
          value={reason}
        />
      </label>
      {message ? (
        <p className="mt-4 text-sm text-[var(--text-2)]" role="status">
          {message}
        </p>
      ) : null}

      <div className="mt-6 space-y-4">
        {cases.map((item) => (
          <article className="surface p-5 md:p-6" key={item.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="eyebrow">{item.claim.method}</p>
                <h2 className="mt-2 text-xl font-bold">{item.claim.player.nickname}</h2>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[.1em] text-[var(--warning)]">
                  Публичный профиль закрыт до полного допуска
                </p>
                <p className="mt-1 text-xs text-[var(--text-3)]">
                  {item.claim.claimant.displayName ?? item.claim.claimant.email}
                </p>
              </div>
              <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-bold">
                P{item.priority}
              </span>
            </div>
            {item.claim.statement ? (
              <p className="surface-soft mt-4 p-4 text-sm">{item.claim.statement}</p>
            ) : null}
            <p className="mt-4 text-xs font-bold text-[var(--text-2)]">
              Документ + лицо + liveness:{' '}
              <span
                className={
                  item.claim.identityStatus === 'APPROVED'
                    ? 'text-[var(--success)]'
                    : 'text-[var(--warning)]'
                }
              >
                {item.claim.identityStatus ?? 'НЕ НАЧАТО'}
              </span>
            </p>
            <div className="mt-4 grid gap-2">
              {item.claim.evidence.map((evidence) => (
                <div
                  className="rounded-lg border border-[var(--border)] p-3 text-xs"
                  key={evidence.id}
                >
                  <strong>{evidence.kind}</strong>
                  <p className="mt-1 break-all text-[var(--text-2)]">{evidence.reference}</p>
                  {evidence.file ? (
                    <p className="mt-1 text-[var(--text-3)]">
                      {evidence.file.originalName} · {Math.ceil(evidence.file.byteSize / 1024)} КБ ·{' '}
                      {evidence.file.scanStatus}
                    </p>
                  ) : null}
                  {evidence.contentUrl ? (
                    <a
                      className="mt-3 inline-flex min-h-9 items-center border border-[var(--brand)] px-3 font-bold text-[var(--brand)]"
                      href={`${apiUrl}${evidence.contentUrl}`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Открыть доказательство
                    </a>
                  ) : null}
                  <p className="mt-1 truncate font-mono text-[10px] text-[var(--text-3)]">
                    {evidence.checksum}
                  </p>
                </div>
              ))}
            </div>
            {status !== 'RESOLVED' ? (
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-black text-[#0b1016]"
                  onClick={() => decide(item.claim.id, 'APPROVED')}
                  type="button"
                >
                  Одобрить
                </button>
                <button
                  className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-bold"
                  onClick={() => decide(item.claim.id, 'EVIDENCE_REQUESTED')}
                  type="button"
                >
                  Запросить evidence
                </button>
                <button
                  className="rounded-lg border border-[rgba(255,95,109,.4)] px-4 py-2 text-xs font-bold text-[var(--danger)]"
                  onClick={() => decide(item.claim.id, 'REJECTED')}
                  type="button"
                >
                  Отклонить
                </button>
              </div>
            ) : null}
          </article>
        ))}
        {!cases.length && !message ? (
          <div className="surface p-8 text-center">
            <h2 className="text-xl font-bold">Очередь пуста</h2>
            <p className="muted mt-2 text-sm">Новые заявки появятся здесь автоматически.</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
