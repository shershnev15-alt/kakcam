import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN = 'arena.access-token';
const REFRESH_TOKEN = 'arena.refresh-token';

export const tokenStore = {
  accessToken: () => SecureStore.getItemAsync(ACCESS_TOKEN),
  refreshToken: () => SecureStore.getItemAsync(REFRESH_TOKEN),
  async save(accessToken: string, refreshToken: string) {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_TOKEN, accessToken, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      }),
      SecureStore.setItemAsync(REFRESH_TOKEN, refreshToken, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      }),
    ]);
  },
  async clear() {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN),
      SecureStore.deleteItemAsync(REFRESH_TOKEN),
    ]);
  },
};
