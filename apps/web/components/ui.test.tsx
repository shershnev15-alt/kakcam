import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { players } from '@arena/demo-data';
import { PlayerCard, RatingRing, VerificationBadge } from './ui';

describe('public profile UI', () => {
  it('renders rating with confidence as separate values', () => {
    const html = renderToStaticMarkup(<RatingRing score={842} confidence={94} />);
    expect(html).toContain('842');
    expect(html).toContain('94% confidence');
  });

  it('renders verification as text, not color alone', () => {
    expect(renderToStaticMarkup(<VerificationBadge level={5} />)).toContain('Платформа');
  });

  it('links a player card to the digital passport', () => {
    const html = renderToStaticMarkup(<PlayerCard player={players[0]!} />);
    expect(html).toContain('/players/frostbyte');
    expect(html).toContain('842');
  });
});
