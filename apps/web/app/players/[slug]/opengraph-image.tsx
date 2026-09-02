import { ImageResponse } from 'next/og';
import { getPlayer } from '@/lib/api';

export const alt = 'Профиль игрока CS2 в Arena Passport';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function PlayerOpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const player = await getPlayer((await params).slug);
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          color: '#f5f7fb',
          background: 'linear-gradient(135deg, #090d14 0%, #10151e 62%, #1c2930 100%)',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 26, color: '#d6ff5f', letterSpacing: 6 }}>
          ARENA PASSPORT · CS2
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 42 }}>
          {player.avatarUrl ? (
            <img
              src={player.avatarUrl}
              width="176"
              height="176"
              alt=""
              style={{ objectFit: 'cover', border: '2px solid #d6ff5f', borderRadius: 42 }}
            />
          ) : (
            <div
              style={{
                width: 176,
                height: 176,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #d6ff5f',
                borderRadius: 42,
                fontSize: 62,
                fontWeight: 800,
                color: '#d6ff5f',
              }}
            >
              {player.nickname.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', fontSize: 76, fontWeight: 900 }}>{player.nickname}</div>
            <div style={{ display: 'flex', fontSize: 30, color: '#aeb8c7' }}>
              {player.countryCode} · {player.teamName ?? 'Без команды'} ·{' '}
              {player.roles[0] ?? 'Player'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 64, alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 24, color: '#aeb8c7' }}>PPR</div>
            <div style={{ display: 'flex', fontSize: 70, fontWeight: 900 }}>
              {player.rating.score}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 24, color: '#aeb8c7' }}>РЕЙТИНГ СНГ</div>
            <div style={{ display: 'flex', fontSize: 52, fontWeight: 800 }}>
              #{player.rating.rank}
            </div>
          </div>
          <div style={{ display: 'flex', marginLeft: 'auto', fontSize: 24, color: '#aeb8c7' }}>
            Источник у каждого факта
          </div>
        </div>
      </div>
    ),
    size,
  );
}
