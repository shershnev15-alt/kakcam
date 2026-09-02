import {
  Controller,
  Get,
  Inject,
  Logger,
  NotFoundException,
  Param,
  ServiceUnavailableException,
} from '@nestjs/common';
import { demoCounts, matches, playerBySlug, players, teamBySlug, teams, tournaments } from './demo';
import { DatabaseService } from './database.service';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  @Get('health')
  health(): Record<string, string> {
    return { status: 'ok', service: 'arena-api', version: '0.1.0' };
  }

  @Get('ready')
  async ready(): Promise<Record<string, unknown>> {
    try {
      const database = await this.database.ping();
      return { status: 'ready', dependencies: { database } };
    } catch (error) {
      this.logger.error(
        'Database readiness check failed',
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException({
        status: 'not_ready',
        dependencies: { database: false },
      });
    }
  }

  @Get('api/v1')
  index(): Record<string, unknown> {
    return {
      name: 'Arena Passport API',
      version: 'v1',
      mode: 'demo',
      counts: demoCounts,
      resources: ['players', 'teams', 'matches', 'tournaments', 'rankings'],
    };
  }

  @Get('api/v1/players')
  listPlayers() {
    return { data: players, meta: { total: players.length, mode: 'demo' } };
  }

  @Get('api/v1/players/:slug')
  getPlayer(@Param('slug') slug: string) {
    const player = playerBySlug(slug);
    if (!player) throw new NotFoundException('Player not found');
    return { data: player, meta: { mode: 'demo' } };
  }

  @Get('api/v1/teams')
  listTeams() {
    return { data: teams, meta: { total: teams.length, mode: 'demo' } };
  }

  @Get('api/v1/teams/:slug')
  getTeam(@Param('slug') slug: string) {
    const team = teamBySlug(slug);
    if (!team) throw new NotFoundException('Team not found');
    return { data: team, meta: { mode: 'demo' } };
  }

  @Get('api/v1/matches')
  listMatches() {
    return { data: matches, meta: { total: matches.length, mode: 'demo' } };
  }

  @Get('api/v1/tournaments')
  listTournaments() {
    return { data: tournaments, meta: { total: tournaments.length, mode: 'demo' } };
  }
}
