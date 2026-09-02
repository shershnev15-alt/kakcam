import { Tabs } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import type { ColorValue } from 'react-native';
import { colors } from '../../src/theme/tokens';

const icon = (label: string, color: ColorValue) => (
  <Text style={[styles.icon, { color }]}>{label}</Text>
);

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.faint,
        tabBarLabelStyle: styles.label,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Главная', tabBarIcon: ({ color }) => icon('A', color) }}
      />
      <Tabs.Screen
        name="matches"
        options={{ title: 'Матчи', tabBarIcon: ({ color }) => icon('M', color) }}
      />
      <Tabs.Screen
        name="rankings"
        options={{ title: 'Рейтинги', tabBarIcon: ({ color }) => icon('#', color) }}
      />
      <Tabs.Screen
        name="discover"
        options={{ title: 'Обзор', tabBarIcon: ({ color }) => icon('◇', color) }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Профиль', tabBarIcon: ({ color }) => icon('●', color) }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 74,
    paddingTop: 7,
    paddingBottom: 8,
    borderTopColor: colors.border,
    backgroundColor: '#0c1017',
  },
  label: { fontSize: 10, fontWeight: '700' },
  icon: { fontSize: 17, fontWeight: '900' },
});
