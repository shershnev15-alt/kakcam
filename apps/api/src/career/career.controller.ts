import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../auth/auth.decorators';
import { CsrfGuard, PermissionsGuard, SessionGuard } from '../auth/auth.guards';
import type { AuthenticatedRequest } from '../auth/auth.types';
import type { HttpRequest } from '../http.types';
import { CareerService } from './career.service';
import {
  parseAchievementReplay,
  parseCreateTransfer,
  parseTransferQuery,
} from './career.validation';

@Controller('api/v1')
export class CareerController {
  constructor(@Inject(CareerService) private readonly career: CareerService) {}

  @Get('players/:slug/career')
  async playerCareer(@Param('slug') slug: string) {
    return { data: await this.career.playerCareer(slug), meta: { source: 'postgresql' } };
  }

  @Get('players/:slug/achievements')
  async playerAchievements(@Param('slug') slug: string) {
    return { data: await this.career.playerAchievements(slug), meta: { source: 'postgresql' } };
  }

  @Get('transfers')
  async transfers(@Query() query: Record<string, string | undefined>) {
    return this.career.listTransfers(parseTransferQuery(query));
  }

  @Post('transfers')
  @RequirePermissions('transfer.manage')
  @UseGuards(CsrfGuard, SessionGuard, PermissionsGuard)
  async createTransfer(@Body() body: unknown, @Req() request: AuthenticatedRequest & HttpRequest) {
    return {
      data: await this.career.createTransfer(parseCreateTransfer(body), request.auth!.id, request),
    };
  }

  @Post('achievements/replay')
  @RequirePermissions('achievement.replay')
  @UseGuards(CsrfGuard, SessionGuard, PermissionsGuard)
  async replay(@Body() body: unknown, @Req() request: AuthenticatedRequest & HttpRequest) {
    const { cutoff } = parseAchievementReplay(body);
    return { data: await this.career.replayAchievements(cutoff, request.auth!.id, request) };
  }
}
