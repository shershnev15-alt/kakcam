import { StyleSheet, Text, View } from 'react-native';
import { FoundationScreen } from '../../src/components/foundation-screen';
import { colors, radius, spacing } from '../../src/theme/tokens';

export default function HomeScreen() {
  return (
    <FoundationScreen
      eyebrow="TODAY / 02 SEP"
      title="Ваш киберспорт без шума"
      copy="Live-матчи, форма избранных и важные рейтинговые изменения."
    >
      <View style={styles.live}>
        <View style={styles.liveTop}>
          <Text style={styles.liveLabel}>LIVE · NORTHERN CUP</Text>
          <Text style={styles.map}>MAP 2 / 3</Text>
        </View>
        <View style={styles.score}>
          <Text style={styles.team}>NRTH</Text>
          <Text style={styles.number}>1 : 0</Text>
          <Text style={styles.team}>TGC</Text>
        </View>
        <Text style={styles.caption}>Mirage · 9:7 · 18 раунд</Text>
      </View>
      <Text style={styles.section}>ИЗБРАННЫЕ</Text>
      <View style={styles.player}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>FR</Text>
        </View>
        <View>
          <Text style={styles.playerName}>frostbyte</Text>
          <Text style={styles.caption}>AWP · Northern Lights</Text>
        </View>
        <View style={styles.rating}>
          <Text style={styles.ratingNumber}>541</Text>
          <Text style={styles.delta}>+8</Text>
        </View>
      </View>
    </FoundationScreen>
  );
}

const styles = StyleSheet.create({
  live: {
    marginTop: 34,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  liveTop: { flexDirection: 'row', justifyContent: 'space-between' },
  liveLabel: { color: colors.accent, fontWeight: '800', fontSize: 10, letterSpacing: 1.3 },
  map: { color: colors.faint, fontSize: 10 },
  score: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 28,
  },
  team: { color: colors.text, fontSize: 17, fontWeight: '800' },
  number: { color: colors.text, fontSize: 38, fontWeight: '800', letterSpacing: -1.5 },
  caption: { color: colors.muted, fontSize: 12 },
  section: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 36,
    marginBottom: 12,
  },
  player: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: '#1e2941',
    marginRight: 12,
  },
  avatarText: { color: colors.text, fontWeight: '800' },
  playerName: { color: colors.text, fontSize: 18, fontWeight: '800' },
  rating: { marginLeft: 'auto', alignItems: 'flex-end' },
  ratingNumber: { color: colors.text, fontSize: 22, fontWeight: '800' },
  delta: { color: colors.success, fontSize: 11 },
});
