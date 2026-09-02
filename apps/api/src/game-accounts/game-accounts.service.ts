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
    return Object.values(this.adapters).map((adapter) => ({
      provider: adapter.provider,
      mode: adapter.mode,
      canVerify: false,
      message:
        adapter.mode === 'DEMO'
          ? 'Деморежим: API-ключ не настроен, подтверждение не выполняется.'
          : 'Доступ к API настроен; владение аккаунтом всё равно требует отдельного challenge-flow.',
    }));
  }
}
