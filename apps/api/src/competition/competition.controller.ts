import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../auth/auth.decorators';
import { CsrfGuard, PermissionsGuard, SessionGuard } from '../auth/auth.guards';
import type { AuthenticatedRequest } from '../auth/auth.types';
import type { HttpRequest } from '../http.types';
import { CompetitionService } from './competition.service';
import {
  parseCompetitionQuery,
  parseCreateMatch,
  parseFinalizeMatch,
} from './competition.validation';

@Controller('api/v1')
export class CompetitionController {
  constructor(@Inject(CompetitionService) private readonly competition: CompetitionService) {}

  @Get('matches')
  listMatches(@Query() query: Record<string, string | undefined>) {
    return this.competition.listMatches(parseCompetitionQuery(query));
  }

  @Get('matches/:id')
  async match(@Param('id') id: string) {
    return { data: await this.competition.matchById(id), meta: { source: 'postgresql' } };
  }

  @Post('matches')
  @RequirePermissions('match.create')
  @UseGuards(CsrfGuard, SessionGuard, PermissionsGuard)
  async createMatch(@Body() body: unknown, @Req() request: AuthenticatedRequest & HttpRequest) {
    return {
      data: await this.competition.createMatch(parseCreateMatch(body), request.auth!.id, request),
    };
  }

  @Post('matches/:id/finalize')
  @RequirePermissions('match.verify')
  @UseGuards(CsrfGuard, SessionGuard, PermissionsGuard)
  async finalizeMatch(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest & HttpRequest,
  ) {
    return {
      data: await this.competition.finalizeMatch(
        id,
        parseFinalizeMatch(body),
        request.auth!.id,
        request,
      ),
    };
  }

  @Get('tournaments')
  listTournaments(@Query() query: Record<string, string | undefined>) {
    return this.competition.listTournaments(parseCompetitionQuery(query));
  }

  @Get('tournaments/:slug')
  async tournament(@Param('slug') slug: string) {
    return { data: await this.competition.tournamentBySlug(slug), meta: { source: 'postgresql' } };
  }
}
