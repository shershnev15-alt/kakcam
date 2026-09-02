import * as SecureStore from 'expo-secure-store';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '../src/theme/tokens';

export const ONBOARDING_KEY = 'arena.onboarding-complete';

export default function EntryScreen() {
  const router = useRouter();
  useEffect(() => {
    void SecureStore.getItemAsync(ONBOARDING_KEY)
      .then((value) => router.replace((value === '1' ? '/(tabs)' : '/onboarding') as Href))
      .catch(() => router.replace('/onboarding' as Href));
  }, [router]);
  return (
    <View style={styles.root}>
      <View style={styles.mark}>
        <Text style={styles.markText}>A</Text>
      </View>
      <ActivityIndicator color={colors.accent} />
      <Text style={styles.text}>Готовим ваш CYBER ID</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    backgroundColor: colors.canvas,
  },
  mark: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: colors.accent,
  },
  markText: { color: colors.canvas, fontSize: 34, fontWeight: '900' },
  text: { color: colors.muted, fontSize: 14 },
});
