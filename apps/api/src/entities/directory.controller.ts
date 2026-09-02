import { Controller, Get, Inject, Query } from '@nestjs/common';
import { EntitiesService } from './entities.service';
import { parseDirectoryQuery, parseSearchQuery } from './directory.validation';

@Controller('api/v1')
export class DirectoryController {
  constructor(@Inject(EntitiesService) private readonly entities: EntitiesService) {}

  @Get('rankings/players')
  playerRankings(@Query() query: Record<string, string | undefined>) {
    return this.entities.listPlayers(
      parseDirectoryQuery({ ...query, sort: 'rating' }, { allowTeam: true }),
    );
  }

  @Get('rankings/teams')
  teamRankings(@Query() query: Record<string, string | undefined>) {
    return this.entities.listTeams(parseDirectoryQuery({ ...query, sort: 'rating' }));
  }

  @Get('search')
  async search(@Query('q') query: unknown) {
    return {
      data: await this.entities.search(parseSearchQuery(query)),
      meta: { source: 'postgresql' },
    };
  }
}
