import * as SecureStore from 'expo-secure-store';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ONBOARDING_KEY } from './index';
import { colors, radius, spacing } from '../src/theme/tokens';

const steps = [
  {
    eyebrow: 'WELCOME',
    title: 'Киберспорт с памятью',
    copy: 'Игроки, матчи, рейтинги и карьера в одном проверяемом профиле.',
    options: [],
  },
  {
    eyebrow: 'YOUR GAME',
    title: 'Counter-Strike 2',
    copy: 'Сейчас Arena работает с CS2. Другие дисциплины появятся позже.',
    options: ['Counter-Strike 2'],
  },
  {
    eyebrow: 'TEAMS',
    title: 'Кто вам интересен?',
    copy: 'Избранные команды поднимаются выше в матч-центре.',
    options: ['Northern Lights', 'Neon Bears', 'Tundra Guard'],
  },
  {
    eyebrow: 'PLAYERS',
    title: 'Выберите игроков',
    copy: 'Сохраним их профили рядом и покажем важные изменения.',
    options: ['frostbyte', 'shift', 'vector', 'kaizen'],
  },
  {
    eyebrow: 'STAY CLOSE',
    title: 'Только важные события',
    copy: 'Перед системным запросом мы всегда объясним, какие уведомления вы получите. Сейчас ничего не включаем.',
    options: ['Начало матча', 'Изменение рейтинга', 'Переход игрока'],
  },
] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<Record<number, string[]>>({ 1: ['Counter-Strike 2'] });
  const current = steps[step]!;
  function toggle(value: string) {
    setSelected((state) => {
      const values = state[step] ?? [];
      return {
        ...state,
        [step]: values.includes(value)
          ? values.filter((item) => item !== value)
          : [...values, value],
      };
    });
  }
  async function finish() {
    await SecureStore.setItemAsync(ONBOARDING_KEY, '1');
    router.replace('/(tabs)' as Href);
  }
  return (
    <ScrollView contentContainerStyle={styles.root}>
      <View style={styles.progress}>
        {steps.map((_, index) => (
          <View key={index} style={[styles.progressItem, index <= step && styles.progressActive]} />
        ))}
      </View>
      <View style={styles.hero}>
        <View style={styles.orbit}>
          <Text style={styles.orbitText}>{step + 1}</Text>
        </View>
        <Text style={styles.eyebrow}>{current.eyebrow}</Text>
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.copy}>{current.copy}</Text>
      </View>
      {current.options.length ? (
        <View style={styles.options}>
          {current.options.map((option) => {
            const active = (selected[step] ?? []).includes(option);
            return (
              <Pressable
                key={option}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
                onPress={() => toggle(option)}
                style={[styles.option, active && styles.optionActive]}
              >
                <Text style={[styles.optionText, active && styles.optionTextActive]}>{option}</Text>
                <Text style={styles.check}>{active ? '✓' : '+'}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <View style={styles.actions}>
        <Pressable onPress={() => void finish()}>
          <Text style={styles.skip}>Пропустить</Text>
        </Pressable>
        <Pressable
          style={styles.next}
          onPress={() =>
            step === steps.length - 1 ? void finish() : setStep((value) => value + 1)
          }
        >
          <Text style={styles.nextText}>
            {step === steps.length - 1 ? 'Открыть Arena' : 'Далее'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: 70,
    paddingBottom: spacing.xl,
    backgroundColor: colors.canvas,
  },
  progress: { flexDirection: 'row', gap: 6 },
  progressItem: { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.border },
  progressActive: { backgroundColor: colors.accent },
  hero: { marginTop: 70 },
  orbit: {
    width: 112,
    height: 112,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    backgroundColor: colors.surface,
  },
  orbitText: { color: colors.accent, fontSize: 44, fontWeight: '800' },
  eyebrow: { color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  title: {
    color: colors.text,
    fontSize: 39,
    lineHeight: 42,
    fontWeight: '800',
    letterSpacing: -1.5,
    marginTop: 10,
  },
  copy: { color: colors.muted, fontSize: 16, lineHeight: 24, marginTop: 18 },
  options: { gap: 9, marginTop: 32 },
  option: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
  },
  optionActive: { borderColor: colors.accent, backgroundColor: '#1b2217' },
  optionText: { color: colors.muted, fontSize: 15, fontWeight: '600' },
  optionTextActive: { color: colors.text },
  check: { color: colors.accent, fontSize: 18 },
  actions: {
    marginTop: 'auto',
    paddingTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skip: { color: colors.muted, padding: 12 },
  next: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  nextText: { color: colors.canvas, fontSize: 15, fontWeight: '800' },
});
