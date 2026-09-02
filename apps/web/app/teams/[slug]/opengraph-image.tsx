import { ImageResponse } from 'next/og';
import { getTeam } from '@/lib/api';

export const alt = 'Профиль команды CS2 в Arena Passport';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function TeamOpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const team = await getTeam((await params).slug);
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
          background: 'linear-gradient(135deg, #090d14 0%, #10151e 62%, #272514 100%)',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 26, color: '#d6ff5f', letterSpacing: 6 }}>
          ARENA PASSPORT · CS2 TEAM
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 42 }}>
          {team.logoUrl ? (
            <img
              src={team.logoUrl}
              width="176"
              height="176"
              alt=""
              style={{ objectFit: 'cover', border: '2px solid #d6ff5f', borderRadius: 88 }}
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
                borderRadius: 88,
                fontSize: 54,
                fontWeight: 900,
                color: '#d6ff5f',
              }}
            >
              {team.shortName}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', fontSize: 68, fontWeight: 900 }}>{team.name}</div>
            <div style={{ display: 'flex', fontSize: 30, color: '#aeb8c7' }}>
              {team.countryCode} · {team.roster.length} игроков · Counter-Strike 2
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 64, alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 24, color: '#aeb8c7' }}>TPR</div>
            <div style={{ display: 'flex', fontSize: 70, fontWeight: 900 }}>
              {team.rating.score}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 24, color: '#aeb8c7' }}>РЕЙТИНГ СНГ</div>
            <div style={{ display: 'flex', fontSize: 52, fontWeight: 800 }}>
              #{team.rating.rank}
            </div>
          </div>
          <div style={{ display: 'flex', marginLeft: 'auto', fontSize: 24, color: '#aeb8c7' }}>
            Проверяемый состав и история
          </div>
        </div>
      </div>
    ),
    size,
  );
}
