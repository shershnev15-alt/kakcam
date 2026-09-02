import { Injectable } from '@nestjs/common';
import {
  FaceitAccountAdapter,
  SteamAccountAdapter,
  type GameAccountAdapter,
  type GameAccountProvider,
} from './game-account.adapters';

@Injectable()
export class GameAccountsService {
  private readonly adapters: Record<GameAccountProvider, GameAccountAdapter> = {
    STEAM: new SteamAccountAdapter(),
    FACEIT: new FaceitAccountAdapter(),
  };

  status() {
    const gameAccounts = Object.values(this.adapters).map((adapter) => ({
      provider: adapter.provider,
      mode: adapter.mode,
      canVerify: false,
      message:
        adapter.mode === 'DEMO'
          ? 'Деморежим: API-ключ не настроен, подтверждение не выполняется.'
          : 'Доступ к API настроен; владение аккаунтом всё равно требует отдельного challenge-flow.',
    }));
    const identityProvider = process.env.IDENTITY_VERIFICATION_PROVIDER?.trim();
    const emailEndpoint = process.env.EMAIL_DELIVERY_ENDPOINT?.trim();
    return [
      ...gameAccounts,
      {
        provider: 'EMAIL',
        mode: emailEndpoint ? 'LIVE' : 'DEMO',
        canVerify: Boolean(emailEndpoint) || process.env.NODE_ENV !== 'production',
        message: emailEndpoint
          ? 'Транзакционная доставка email настроена.'
          : 'Локальный preview-код доступен только вне production.',
      },
      {
        provider: 'IDENTITY_DOCUMENT',
        mode: identityProvider ? 'LIVE' : 'DEMO',
        canVerify: Boolean(identityProvider && process.env.IDENTITY_VERIFICATION_API_KEY),
        message: identityProvider
          ? `Подготовлен внешний KYC-провайдер ${identityProvider}; запуск требует SDK/webhook и политики биометрических данных.`
          : 'Провайдер Face ID + документы не выбран; автоматическое решение не выполняется.',
      },
      {
        provider: 'BILLING',
        mode: process.env.BILLING_PROVIDER ? 'LIVE' : 'DEMO',
        canVerify: Boolean(process.env.BILLING_PROVIDER && process.env.BILLING_WEBHOOK_SECRET),
        message: process.env.BILLING_PROVIDER
          ? 'Платёжный провайдер указан; webhook должен подписывать изменения Subscription.'
          : 'Тарифная модель готова, списания отключены до выбора эквайринга.',
      },
    ];
  }
}
