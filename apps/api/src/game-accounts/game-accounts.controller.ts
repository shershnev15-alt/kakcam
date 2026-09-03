import { Controller, Get, Inject, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { CsrfGuard, SessionGuard } from '../auth/auth.guards';
import type { AuthenticatedRequest } from '../auth/auth.types';
import type { HttpRequest } from '../http.types';
import { GameAccountsService } from './game-accounts.service';

type RedirectResponse = { redirect(status: number, url: string): void };

@Controller('api/v1/integrations')
export class GameAccountsController {
  constructor(@Inject(GameAccountsService) private readonly gameAccounts: GameAccountsService) {}

  @Get('status')
  status() {
    return { data: this.gameAccounts.status() };
  }

  @Post('steam/start')
  @UseGuards(CsrfGuard, SessionGuard)
  async startSteam(@Query('playerSlug') playerSlug: string, @Req() request: AuthenticatedRequest) {
    return { data: await this.gameAccounts.startSteam(playerSlug, request.auth!.id) };
  }

  @Get('steam/callback')
  @UseGuards(SessionGuard)
  async steamCallback(
    @Query() query: Record<string, string | undefined>,
    @Req() request: AuthenticatedRequest & HttpRequest,
    @Res() response: RedirectResponse,
  ) {
    await this.gameAccounts.finishSteam(query, request.auth!.id, request);
    response.redirect(
      302,
      `${process.env.PUBLIC_WEB_URL ?? 'http://localhost:3000'}/account?linked=steam`,
    );
  }

  @Post('faceit/start')
  @UseGuards(CsrfGuard, SessionGuard)
  async startFaceit(@Query('playerSlug') playerSlug: string, @Req() request: AuthenticatedRequest) {
    return { data: await this.gameAccounts.startFaceit(playerSlug, request.auth!.id) };
  }

  @Get('faceit/callback')
  @UseGuards(SessionGuard)
  async faceitCallback(
    @Query() query: Record<string, string | undefined>,
    @Req() request: AuthenticatedRequest & HttpRequest,
    @Res() response: RedirectResponse,
  ) {
    await this.gameAccounts.finishFaceit(query, request.auth!.id, request);
    response.redirect(
      302,
      `${process.env.PUBLIC_WEB_URL ?? 'http://localhost:3000'}/account?linked=faceit`,
    );
  }
}
