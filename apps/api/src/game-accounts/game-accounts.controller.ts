import { Controller, Get, Inject } from '@nestjs/common';
import { GameAccountsService } from './game-accounts.service';

@Controller('api/v1/integrations')
export class GameAccountsController {
  constructor(@Inject(GameAccountsService) private readonly gameAccounts: GameAccountsService) {}

  @Get('status')
  status() {
    return { data: this.gameAccounts.status() };
  }
}
