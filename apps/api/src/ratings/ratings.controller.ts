import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../auth/auth.decorators';
import { CsrfGuard, PermissionsGuard, SessionGuard } from '../auth/auth.guards';
import type { AuthenticatedRequest } from '../auth/auth.types';
import type { HttpRequest } from '../http.types';
import { RatingsService } from './ratings.service';
import { parseRecalculateRatings } from './ratings.validation';

@Controller('api/v1')
export class RatingsController {
  constructor(@Inject(RatingsService) private readonly ratings: RatingsService) {}

  @Get('ratings/runs')
  runs(@Query('engine') engine?: string) {
    return this.ratings.runs(engine);
  }

  @Post('ratings/recalculate')
  @RequirePermissions('rating.run')
  @UseGuards(CsrfGuard, SessionGuard, PermissionsGuard)
  recalculate(@Body() body: unknown, @Req() request: AuthenticatedRequest & HttpRequest) {
    return this.ratings.recalculate(
      parseRecalculateRatings(body).cutoff,
      request.auth!.id,
      request,
    );
  }

  @Get('players/:slug/ratings')
  playerHistory(@Param('slug') slug: string) {
    return this.ratings.playerHistory(slug);
  }

  @Get('teams/:slug/ratings')
  teamHistory(@Param('slug') slug: string) {
    return this.ratings.teamHistory(slug);
  }
}
