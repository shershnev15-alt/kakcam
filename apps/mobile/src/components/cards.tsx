import type { Href } from 'expo-router';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type {
  MatchSummary,
  PlayerSummary,
  TeamSummary,
  TournamentSummary,
  TransferSummary,
} from '../api/types';
import { formatDateTime, initials, score } from '../lib/format';
import { colors, radius, spacing } from '../theme/tokens';
import { ReminderAction } from './entity-actions';

export function MatchCard({
  match,
  reminder = false,
}: {
  match: MatchSummary;
  reminder?: boolean;
}) {
  const label = `${match.homeTeam?.shortName ?? 'TBD'} — ${match.awayTeam?.shortName ?? 'TBD'}`;
  return (
    <View style={styles.matchCard}>
      <Link href={`/matches/${match.id}` as Href} asChild>
        <Pressable accessibilityRole="link">
          <View style={styles.cardTop}>
            <Text style={[styles.status, match.status === 'LIVE' && styles.live]}>
              {match.status}
            </Text>
            <Text style={styles.meta}>{formatDateTime(match.startsAt)}</Text>
          </View>
          <Text style={styles.meta}>{match.tournament}</Text>
          <View style={styles.scoreRow}>
            <View style={styles.teamIdentity}>
              <Avatar label={match.homeTeam?.shortName ?? '?'} />
              <Text style={styles.teamName}>{match.homeTeam?.shortName ?? 'TBD'}</Text>
            </View>
            <Text style={styles.score}>
              {score(match.homeScore)} : {score(match.awayScore)}
            </Text>
            <View style={[styles.teamIdentity, styles.teamIdentityRight]}>
              <Text style={styles.teamName}>{match.awayTeam?.shortName ?? 'TBD'}</Text>
              <Avatar label={match.awayTeam?.shortName ?? '?'} />
            </View>
          </View>
          <Text style={styles.caption}>
            {match.stage} · BO{match.bestOf} · trust L{match.verificationLevel}
          </Text>
        </Pressable>
      </Link>
      {reminder && match.status === 'UPCOMING' ? (
        <ReminderAction matchId={match.id} startsAt={match.startsAt} label={label} />
      ) : null}
    </View>
  );
}

export function PlayerRow({ player, position }: { player: PlayerSummary; position?: number }) {
  return (
    <Link href={`/players/${player.slug}` as Href} asChild>
      <Pressable style={styles.row} accessibilityRole="link">
        <Text style={styles.position}>{position ?? player.rating?.rank ?? '—'}</Text>
        <Avatar label={player.nickname} />
        <View style={styles.grow}>
          <View style={styles.nameLine}>
            <Text style={styles.name}>{player.nickname}</Text>
            {player.verificationLevel >= 3 ? <Text style={styles.verified}>✓</Text> : null}
          </View>
          <Text style={styles.caption} numberOfLines={1}>
            {player.roles.join(' / ') || 'Игрок'} · {player.teamShortName ?? 'Без команды'}
          </Text>
        </View>
        <View style={styles.ratingBox}>
          <Text style={styles.rating}>{player.rating?.score ?? '—'}</Text>
          <Text style={styles.confidence}>{player.rating?.confidence ?? 0}% conf.</Text>
        </View>
      </Pressable>
    </Link>
  );
}

export function TeamRow({ team, position }: { team: TeamSummary; position?: number }) {
  return (
    <Link href={`/teams/${team.slug}` as Href} asChild>
      <Pressable style={styles.row} accessibilityRole="link">
        <Text style={styles.position}>{position ?? team.rating?.rank ?? '—'}</Text>
        <Avatar label={team.shortName} />
        <View style={styles.grow}>
          <View style={styles.nameLine}>
            <Text style={styles.name}>{team.name}</Text>
            {team.verificationLevel >= 3 ? <Text style={styles.verified}>✓</Text> : null}
          </View>
          <Text style={styles.caption}>{team.countryName ?? 'Регион не указан'}</Text>
        </View>
        <View style={styles.ratingBox}>
          <Text style={styles.rating}>{team.rating?.score ?? '—'}</Text>
          <Text style={styles.confidence}>{team.form.join('')}</Text>
        </View>
      </Pressable>
    </Link>
  );
}

export function TournamentCard({ tournament }: { tournament: TournamentSummary }) {
  return (
    <Link href={`/tournaments/${tournament.slug}` as Href} asChild>
      <Pressable style={styles.tournament} accessibilityRole="link">
        <View style={styles.cardTop}>
          <Text style={styles.status}>{tournament.status}</Text>
          <Text style={styles.meta}>{tournament.mode}</Text>
        </View>
        <Text style={styles.tournamentName}>{tournament.name}</Text>
        <Text style={styles.caption}>
          {tournament.tier} · {tournament.participantCount} команд · {tournament.matchCount} матчей
        </Text>
        <Text style={styles.tournamentDate}>{formatDateTime(tournament.startsAt)}</Text>
      </Pressable>
    </Link>
  );
}

export function TransferCard({ transfer }: { transfer: TransferSummary }) {
  return (
    <Link href={`/players/${transfer.player.slug}` as Href} asChild>
      <Pressable style={styles.transfer} accessibilityRole="link">
        <Avatar label={transfer.player.nickname} />
        <View style={styles.grow}>
          <Text style={styles.name}>{transfer.player.nickname}</Text>
          <Text style={styles.caption}>
            {transfer.fromTeam?.shortName ?? 'FA'} → {transfer.toTeam?.shortName ?? 'FA'}
          </Text>
        </View>
        <View style={styles.ratingBox}>
          <Text style={styles.verified}>L{transfer.verificationLevel}</Text>
          <Text style={styles.confidence}>{transfer.status}</Text>
        </View>
      </Pressable>
    </Link>
  );
}

export function Avatar({ label, large = false }: { label: string; large?: boolean }) {
  return (
    <View style={[styles.avatar, large && styles.avatarLarge]}>
      <Text style={[styles.avatarText, large && styles.avatarTextLarge]}>{initials(label)}</Text>
    </View>
  );
}

export function StatGrid({ items }: { items: Array<{ label: string; value: string | number }> }) {
  return (
    <View style={styles.stats}>
      {items.map((item) => (
        <View key={item.label} style={styles.stat}>
          <Text style={styles.statValue}>{item.value}</Text>
          <Text style={styles.statLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  matchCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  status: { color: colors.accent, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  live: { color: colors.danger },
  meta: { color: colors.faint, fontSize: 10, marginTop: 5 },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 18,
  },
  teamIdentity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  teamIdentityRight: { justifyContent: 'flex-end' },
  teamName: { color: colors.text, fontSize: 14, fontWeight: '800' },
  score: { color: colors.text, fontSize: 27, fontWeight: '900', letterSpacing: -1 },
  caption: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  position: { width: 22, color: colors.faint, fontWeight: '800', textAlign: 'center' },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarLarge: { width: 78, height: 78, borderRadius: radius.lg },
  avatarText: { color: colors.text, fontWeight: '900', fontSize: 12 },
  avatarTextLarge: { fontSize: 22 },
  grow: { flex: 1, minWidth: 0 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { color: colors.text, fontSize: 15, fontWeight: '800' },
  verified: { color: colors.accent, fontSize: 11, fontWeight: '900' },
  ratingBox: { alignItems: 'flex-end' },
  rating: { color: colors.text, fontSize: 20, fontWeight: '900' },
  confidence: { color: colors.faint, fontSize: 9, marginTop: 2 },
  tournament: {
    width: 250,
    minHeight: 150,
    marginRight: 10,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tournamentName: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 19 },
  tournamentDate: { color: colors.accent, fontSize: 11, fontWeight: '800', marginTop: 'auto' },
  transfer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: spacing.md,
    marginBottom: 9,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 90,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { color: colors.text, fontSize: 22, fontWeight: '900' },
  statLabel: { color: colors.faint, fontSize: 9, marginTop: 4, textTransform: 'uppercase' },
});
