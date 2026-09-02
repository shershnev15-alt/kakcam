'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { resources } from '../lib/resources';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

type User = {
  id: string;
  email: string;
  displayName: string | null;
  roles: string[];
  permissions: string[];
};

type AdminRow = {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  version: string | null;
  fields: Record<string, unknown>;
};

type PageData = {
  data: AdminRow[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
};

type Overview = {
  totals: { players: number; teams: number; matches: number; tournaments: number; users: number };
  queues: {
    openClaims: number;
    candidateAssertions: number;
    queuedImports: number;
    openReports: number;
  };
  activity: { audit24h: number };
};

type Command = {
  id: string;
  label: string;
  method: 'POST' | 'PATCH';
  endpoint: string;
  payload: Record<string, unknown>;
  selection?: boolean;
  reason?: boolean;
  danger?: boolean;
};

export function commandsFor(resource: string, row: AdminRow | undefined): Command[] {
  const now = new Date().toISOString();
  const selected = row?.id ?? '{id}';
  switch (resource) {
    case 'players':
      return [
        {
          id: 'create-player',
          label: 'Создать игрока',
          method: 'POST',
          endpoint: '/players',
          payload: {
            slug: 'new-player',
            nickname: 'newplayer',
            countryCode: 'RU',
            realName: 'Новый игрок',
          },
        },
        {
          id: 'archive-player',
          label: 'Архивировать',
          method: 'POST',
          endpoint: `/admin/entities/player/${selected}/archive`,
          payload: { reason: 'Дублирующий профиль' },
          selection: true,
          reason: true,
          danger: true,
        },
      ];
    case 'teams':
      return [
        {
          id: 'create-team',
          label: 'Создать команду',
          method: 'POST',
          endpoint: '/teams',
          payload: { slug: 'new-team', name: 'New Team', shortName: 'NEW', countryCode: 'RU' },
        },
        {
          id: 'archive-team',
          label: 'Архивировать',
          method: 'POST',
          endpoint: `/admin/entities/team/${selected}/archive`,
          payload: { reason: 'Команда расформирована' },
          selection: true,
          reason: true,
          danger: true,
        },
      ];
    case 'matches':
      return [
        {
          id: 'create-match',
          label: 'Создать матч',
          method: 'POST',
          endpoint: '/matches',
          payload: {
            homeTeamSlug: 'northern-lights',
            awayTeamSlug: 'neon-bears',
            tournamentSlug: 'eurasia-masters-2026',
            startsAt: '2026-09-10T17:00:00.000Z',
            stage: 'Playoffs',
            bestOf: 3,
          },
        },
        {
          id: 'finalize-match',
          label: 'Финализировать',
          method: 'POST',
          endpoint: `/matches/${selected}/finalize`,
          payload: {
            homeScore: 2,
            awayScore: 0,
            sourceCode: 'arena-demo',
            reason: 'Результат сверен с протоколом',
            maps: [
              { mapKey: 'mirage', homeScore: 13, awayScore: 8, overtime: false },
              { mapKey: 'nuke', homeScore: 13, awayScore: 10, overtime: false },
            ],
          },
          selection: true,
          reason: true,
          danger: true,
        },
      ];
    case 'tournaments':
      return [
        {
          id: 'create-tournament',
          label: 'Создать турнир',
          method: 'POST',
          endpoint: '/admin/tournaments',
          payload: {
            slug: 'autumn-cup-2026',
            gameSlug: 'cs2',
            name: 'Autumn Cup 2026',
            tier: 'Regional',
            mode: 'LAN',
            startsAt: '2026-10-01T10:00:00.000Z',
            endsAt: '2026-10-05T20:00:00.000Z',
            prizePool: 50000,
            currency: 'USD',
          },
        },
        {
          id: 'update-tournament',
          label: 'Обновить турнир',
          method: 'PATCH',
          endpoint: `/admin/tournaments/${selected}`,
          payload: {
            slug: String(row?.fields.slug ?? 'tournament'),
            gameSlug: String(row?.fields.gameSlug ?? 'cs2'),
            name: row?.title ?? 'Tournament',
            tier: String(row?.fields.tier ?? 'Regional'),
            mode: String(row?.fields.mode ?? 'LAN'),
            startsAt: String(row?.fields.startsAt ?? now),
            endsAt: String(row?.fields.endsAt ?? now),
            prizePool: Number(row?.fields.prizePool ?? 0),
            currency: String(row?.fields.currency ?? 'USD'),
          },
          selection: true,
        },
      ];
    case 'organizations':
      return [
        {
          id: 'create-organization',
          label: 'Создать организацию',
          method: 'POST',
          endpoint: '/admin/organizations',
          payload: {
            slug: 'arena-group',
            name: 'Arena Group',
            countryCode: 'RU',
            website: 'https://example.com',
            isFederation: false,
          },
        },
        {
          id: 'update-organization',
          label: 'Обновить',
          method: 'PATCH',
          endpoint: `/admin/organizations/${selected}`,
          payload: {
            slug: row?.subtitle ?? 'organization',
            name: row?.title ?? 'Organization',
            countryCode: String(row?.fields.countryCode ?? 'RU'),
            website: String(row?.fields.website ?? 'https://example.com'),
            isFederation: Boolean(row?.fields.isFederation),
          },
          selection: true,
        },
        {
          id: 'set-federation-reviewer',
          label: 'Назначить верификатора',
          method: 'POST',
          endpoint: `/admin/federations/${selected}/reviewer`,
          payload: {
            userId: '00000000-0000-4000-8000-000000000000',
            enabled: true,
            reason: 'Полномочия подтверждены местной федерацией',
          },
          selection: true,
          reason: true,
          danger: true,
        },
      ];
    case 'verification':
      return [
        {
          id: 'approve-claim',
          label: 'Одобрить claim',
          method: 'POST',
          endpoint: `/moderation/claims/${selected}/decision`,
          payload: { decision: 'APPROVED', reason: 'Личность и evidence проверены' },
          selection: true,
          reason: true,
          danger: true,
        },
        {
          id: 'publish-player',
          label: 'Опубликовать игрока',
          method: 'POST',
          endpoint: `/moderation/players/${String(row?.fields.playerSlug ?? '{slug}')}/publication`,
          payload: {
            decision: 'PUBLISH',
            selfClaimId: selected,
            federationId: '00000000-0000-4000-8000-000000000000',
            photoEvidenceId: '00000000-0000-4000-8000-000000000000',
            publicPhotoUrl: '/media/players/verified-photo.webp',
            reason: 'Self-claim, фото, Steam и FACEIT подтверждены местной федерацией',
          },
          selection: true,
          reason: true,
          danger: true,
        },
        {
          id: 'revoke-player-publication',
          label: 'Закрыть профиль игрока',
          method: 'POST',
          endpoint: `/moderation/players/${String(row?.fields.playerSlug ?? '{slug}')}/publication`,
          payload: {
            decision: 'REVOKE',
            reason: 'Одно из обязательных подтверждений отозвано',
          },
          selection: true,
          reason: true,
          danger: true,
        },
        {
          id: 'request-evidence',
          label: 'Запросить evidence',
          method: 'POST',
          endpoint: `/moderation/claims/${selected}/decision`,
          payload: { decision: 'EVIDENCE_REQUESTED', reason: 'Нужен дополнительный документ' },
          selection: true,
          reason: true,
        },
        {
          id: 'reject-claim',
          label: 'Отклонить claim',
          method: 'POST',
          endpoint: `/moderation/claims/${selected}/decision`,
          payload: { decision: 'REJECTED', reason: 'Evidence не подтверждает владение профилем' },
          selection: true,
          reason: true,
          danger: true,
        },
      ];
    case 'assertions':
      return [
        {
          id: 'create-assertion',
          label: 'Создать assertion',
          method: 'POST',
          endpoint: '/admin/assertions',
          payload: {
            entityType: 'Player',
            entityId: '00000000-0000-4000-8000-000000000001',
            fieldPath: 'profile.realName',
            value: 'Алексей Морозов',
            sourceCode: 'arena-demo',
            observedAt: now,
            verificationLevel: 3,
            reason: 'Факт получен из официальной заявки',
          },
          reason: true,
        },
        {
          id: 'resolve-assertion',
          label: 'Принять assertion',
          method: 'POST',
          endpoint: `/admin/assertions/${selected}/resolve`,
          payload: { status: 'EFFECTIVE', reason: 'Источник и значение проверены' },
          selection: true,
          reason: true,
          danger: true,
        },
      ];
    case 'imports':
      return [
        {
          id: 'stage-alpha',
          label: 'Stage CS2 Alpha',
          method: 'POST',
          endpoint: '/admin/imports/provider',
          payload: {
            sourceCode: 'cs2-demo-alpha',
            externalKey: 'alpha-upcoming-001',
            reason: 'Проверка upcoming CS2 feed Alpha',
          },
          reason: true,
        },
        {
          id: 'stage-bravo',
          label: 'Stage CS2 Bravo',
          method: 'POST',
          endpoint: '/admin/imports/provider',
          payload: {
            sourceCode: 'cs2-demo-bravo',
            externalKey: 'bravo-result-001',
            reason: 'Проверка result/statistics CS2 feed Bravo',
          },
          reason: true,
        },
        {
          id: 'apply-import',
          label: 'Применить REVIEW',
          method: 'POST',
          endpoint: `/admin/imports/${selected}/apply`,
          payload: { reason: 'Preview и identity resolution проверены' },
          selection: true,
          reason: true,
          danger: true,
        },
        {
          id: 'retry-import',
          label: 'Повторить FAILED',
          method: 'POST',
          endpoint: `/admin/imports/${selected}/retry`,
          payload: { resolution: 'Ошибка маппинга исправлена' },
          selection: true,
          reason: true,
        },
      ];
    case 'reports':
      return [
        {
          id: 'resolve-report',
          label: 'Закрыть жалобу',
          method: 'POST',
          endpoint: `/admin/reports/${selected}/resolve`,
          payload: { resolution: 'Факты проверены, коррекция внесена' },
          selection: true,
          reason: true,
          danger: true,
        },
      ];
    case 'users':
      return [
        {
          id: 'assign-roles',
          label: 'Назначить роли',
          method: 'POST',
          endpoint: `/admin/users/${selected}/roles`,
          payload: {
            roleCodes: ['REGISTERED_USER', 'MODERATOR'],
            reason: 'Доступ выдан по заявке',
          },
          selection: true,
          reason: true,
          danger: true,
        },
        {
          id: 'suspend-user',
          label: 'Приостановить',
          method: 'PATCH',
          endpoint: `/admin/users/${selected}/status`,
          payload: { status: 'SUSPENDED', reason: 'Нарушение правил платформы' },
          selection: true,
          reason: true,
          danger: true,
        },
      ];
    case 'achievements':
      return [
        {
          id: 'update-achievement',
          label: 'Обновить правило',
          method: 'PATCH',
          endpoint: `/admin/achievements/${selected}`,
          payload: {
            title: row?.title ?? 'Достижение',
            description: String(row?.fields.description ?? 'Описание'),
            rarity: row?.status ?? 'COMMON',
            ruleVersion: Number(row?.fields.ruleVersion ?? 1) + 1,
            rule: row?.fields.rule ?? { operator: 'gte', target: 1 },
            reason: 'Новая версия правила протестирована',
          },
          selection: true,
          reason: true,
          danger: true,
        },
        {
          id: 'replay-achievements',
          label: 'Replay достижений',
          method: 'POST',
          endpoint: '/achievements/replay',
          payload: { cutoff: now },
        },
      ];
    case 'ratings':
      return [
        {
          id: 'recalculate-ratings',
          label: 'Пересчитать PPR / TPR',
          method: 'POST',
          endpoint: '/ratings/recalculate',
          payload: { cutoff: now },
          danger: true,
        },
      ];
    default:
      return [];
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function AdminConsole({ resource }: { resource?: string }) {
  const [user, setUser] = useState<User | null>();
  const [rows, setRows] = useState<PageData | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [selectedId, setSelectedId] = useState<string>();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [commandId, setCommandId] = useState<string>();
  const [payload, setPayload] = useState('{}');
  const [preview, setPreview] = useState(false);

  const selected = rows?.data.find((item) => item.id === selectedId);
  const commands = useMemo(() => commandsFor(resource ?? '', selected), [resource, selected]);
  const command = commands.find((item) => item.id === commandId) ?? commands[0];

  const load = useCallback(async () => {
    if (!user?.permissions.includes('admin.read')) return;
    setBusy(true);
    setMessage(undefined);
    try {
      if (resource) {
        const query = new URLSearchParams({ page: String(page), pageSize: '20' });
        if (search) query.set('q', search);
        setRows(await api<PageData>(`/admin/resources/${resource}?${query}`));
      } else {
        const result = await api<{ data: Overview }>('/admin/overview');
        setOverview(result.data);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Ошибка загрузки');
    } finally {
      setBusy(false);
    }
  }, [page, resource, search, user]);

  useEffect(() => {
    void api<{ data: User }>('/auth/me')
      .then((result) => setUser(result.data))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const next = commands[0];
    setCommandId(next?.id);
    setPayload(JSON.stringify(next?.payload ?? {}, null, 2));
    setPreview(false);
  }, [commands]);

  function chooseCommand(id: string) {
    const next = commands.find((item) => item.id === id);
    setCommandId(id);
    setPayload(JSON.stringify(next?.payload ?? {}, null, 2));
    setPreview(false);
  }

  function preparePreview() {
    if (!command) return;
    if (command.selection && !selected) {
      setMessage('Сначала выберите запись в таблице');
      return;
    }
    try {
      const value = JSON.parse(payload) as Record<string, unknown>;
      if (command.reason) {
        const reason = value.reason ?? value.resolution;
        if (typeof reason !== 'string' || reason.trim().length < 4)
          throw new Error('Укажите основание для операции');
      }
      setMessage(undefined);
      setPreview(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Некорректный JSON');
    }
  }

  async function execute() {
    if (!command) return;
    setBusy(true);
    setMessage(undefined);
    try {
      await api(command.endpoint, {
        method: command.method,
        headers:
          command.method === 'PATCH' && selected?.version
            ? { 'If-Match': `"${selected.version}"` }
            : {},
        body: payload,
      });
      setMessage('Операция выполнена и записана в аудит');
      setPreview(false);
      setSelectedId(undefined);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Операция не выполнена');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await api('/auth/logout', { method: 'POST', body: '{}' }).catch(() => undefined);
    setUser(null);
  }

  if (user === undefined)
    return (
      <div className="center-state">
        <span className="loader" />
        Проверяем доступ…
      </div>
    );
  if (!user) return <LoginPanel onLogin={setUser} />;
  if (!user.permissions.includes('admin.read'))
    return (
      <div className="center-state">
        <strong>Нет доступа</strong>
        <span>Для консоли нужна роль Moderator, Admin или Super Admin.</span>
      </div>
    );

  const title = resources.find((item) => item.slug === resource)?.label ?? 'Обзор';
  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <a className="brand" href="/">
          <span>AP</span>
          <div>
            CYBER ID<small>OPERATIONS</small>
          </div>
        </a>
        <nav aria-label="Модули администратора">
          <a className={!resource ? 'active' : ''} href="/">
            Обзор
          </a>
          {resources.map((item) => (
            <a
              key={item.slug}
              className={resource === item.slug ? 'active' : ''}
              href={`/${item.slug}`}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="operator">
          <span>{user.displayName ?? user.email}</span>
          <small>{user.roles.join(' · ')}</small>
          <button onClick={() => void logout()}>Выйти</button>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <p>CONTROL ROOM / {resource?.toUpperCase() ?? 'OVERVIEW'}</p>
            <h1>{title}</h1>
          </div>
          <div className="system-state">
            <i /> API и PostgreSQL в строю
          </div>
        </header>
        {message ? (
          <div className="notice" role="status">
            {message}
          </div>
        ) : null}
        {!resource ? (
          <Dashboard overview={overview} busy={busy} />
        ) : (
          <div className="workspace">
            <section className="registry-panel">
              <div className="toolbar">
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    setPage(1);
                    void load();
                  }}
                >
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Поиск по модулю"
                  />
                  <button>Найти</button>
                </form>
                <span>{rows?.meta.total ?? 0} записей</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Запись</th>
                      <th>Статус</th>
                      <th>Данные</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows?.data.map((row) => (
                      <tr
                        key={row.id}
                        className={selectedId === row.id ? 'selected' : ''}
                        onClick={() => setSelectedId(row.id)}
                      >
                        <td>
                          <strong>{row.title}</strong>
                          <small>{row.subtitle}</small>
                        </td>
                        <td>
                          <span className={`status status-${row.status.toLowerCase()}`}>
                            {row.status}
                          </span>
                        </td>
                        <td>
                          <code>{JSON.stringify(row.fields)}</code>
                        </td>
                      </tr>
                    ))}
                    {!busy && !rows?.data.length ? (
                      <tr>
                        <td colSpan={3} className="empty">
                          Записей нет. Создайте первую операцию справа.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              <div className="pagination">
                <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
                  Назад
                </button>
                <span>
                  {page} / {rows?.meta.totalPages || 1}
                </span>
                <button
                  disabled={page >= (rows?.meta.totalPages || 1)}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Далее
                </button>
              </div>
            </section>

            <aside className="command-panel">
              <p className="eyebrow">Команда</p>
              <h2>{selected ? selected.title : 'Новая операция'}</h2>
              {!commands.length ? (
                <p className="muted">
                  Модуль доступен только для чтения. Immutable данные не изменяются.
                </p>
              ) : (
                <>
                  <label>
                    Сценарий
                    <select
                      value={command?.id}
                      onChange={(event) => chooseCommand(event.target.value)}
                    >
                      {commands.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Payload
                    <textarea
                      rows={14}
                      value={payload}
                      onChange={(event) => {
                        setPayload(event.target.value);
                        setPreview(false);
                      }}
                      spellCheck={false}
                    />
                  </label>
                  {!preview ? (
                    <button
                      className={command?.danger ? 'primary danger' : 'primary'}
                      disabled={busy}
                      onClick={preparePreview}
                    >
                      Показать preview
                    </button>
                  ) : (
                    <div className="preview">
                      <strong>Проверьте изменение</strong>
                      <code>
                        {command?.method} {command?.endpoint}
                      </code>
                      <p>
                        {command?.reason
                          ? 'Основание будет сохранено в immutable audit.'
                          : 'Команда будет записана в audit.'}
                      </p>
                      <div>
                        <button onClick={() => setPreview(false)}>Назад</button>
                        <button
                          className={command?.danger ? 'danger' : ''}
                          disabled={busy}
                          onClick={() => void execute()}
                        >
                          Выполнить
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

function Dashboard({ overview, busy }: { overview: Overview | null; busy: boolean }) {
  if (busy && !overview)
    return (
      <div className="center-state">
        <span className="loader" />
        Собираем операционную сводку…
      </div>
    );
  const totals = overview?.totals;
  return (
    <>
      <section className="metric-grid">
        {Object.entries(totals ?? {}).map(([key, value]) => (
          <article key={key}>
            <small>{key}</small>
            <strong>{value}</strong>
          </article>
        ))}
        <article className="accent">
          <small>audit / 24h</small>
          <strong>{overview?.activity.audit24h ?? 0}</strong>
        </article>
      </section>
      <section className="queue-grid">
        <article>
          <p>TRUST QUEUE</p>
          <h2>Верификация</h2>
          <strong>{overview?.queues.openClaims ?? 0}</strong>
          <a href="/verification">Открыть очередь →</a>
        </article>
        <article>
          <p>DATA CONFLICTS</p>
          <h2>Assertions</h2>
          <strong>{overview?.queues.candidateAssertions ?? 0}</strong>
          <a href="/assertions">Разрешить конфликты →</a>
        </article>
        <article>
          <p>INGESTION</p>
          <h2>Импорты</h2>
          <strong>{overview?.queues.queuedImports ?? 0}</strong>
          <a href="/imports">Контроль очереди →</a>
        </article>
        <article>
          <p>COMMUNITY</p>
          <h2>Жалобы</h2>
          <strong>{overview?.queues.openReports ?? 0}</strong>
          <a href="/reports">На рассмотрение →</a>
        </article>
      </section>
    </>
  );
}

function LoginPanel({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState('admin@arena.local');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const result = await api<{ data: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      onLogin(result.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось войти');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <div className="login-mark">cyberID</div>
      <form onSubmit={(event) => void submit(event)}>
        <p>CYBER ID / OPERATIONS</p>
        <h1>Вход для оператора</h1>
        <span>Консоль показывает только модули, разрешенные вашей ролью.</span>
        <label>
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          Пароль
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error ? <div className="notice">{error}</div> : null}
        <button className="primary" disabled={busy}>
          {busy ? 'Проверяем…' : 'Войти'}
        </button>
      </form>
    </div>
  );
}
