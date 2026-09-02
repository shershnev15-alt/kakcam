import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { HttpRequest } from '../http.types';
import { RequirePermissions } from '../auth/auth.decorators';
import { CsrfGuard, PermissionsGuard, SessionGuard } from '../auth/auth.guards';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { EntitiesService } from './entities.service';
import { parseDirectoryQuery } from './directory.validation';
import { parseCreatePlayer, parseUpdatePlayer } from './entities.validation';

@Controller('api/v1/players')
export class PlayersController {
  constructor(@Inject(EntitiesService) private readonly entities: EntitiesService) {}

  @Get()
  async list(@Query() query: Record<string, string | undefined>) {
    return this.entities.listPlayers(parseDirectoryQuery(query, { allowTeam: true }));
  }

  @Get(':slug')
  async detail(@Param('slug') slug: string) {
    return { data: await this.entities.playerBySlug(slug), meta: { source: 'postgresql' } };
  }

  @Post()
  @RequirePermissions('player.create')
  @UseGuards(CsrfGuard, SessionGuard, PermissionsGuard)
  async create(@Body() body: unknown, @Req() request: AuthenticatedRequest & HttpRequest) {
    return {
      data: await this.entities.createPlayer(parseCreatePlayer(body), request.auth!.id, request),
    };
  }

  @Patch(':slug')
  @RequirePermissions('player.update')
  @UseGuards(CsrfGuard, SessionGuard, PermissionsGuard)
  async update(
    @Param('slug') slug: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest & HttpRequest,
  ) {
    return {
      data: await this.entities.updatePlayer(
        slug,
        parseUpdatePlayer(body),
        request.auth!.id,
        request,
      ),
    };
  }

  @Delete(':slug')
  @RequirePermissions('player.archive')
  @UseGuards(CsrfGuard, SessionGuard, PermissionsGuard)
  async archive(@Param('slug') slug: string, @Req() request: AuthenticatedRequest & HttpRequest) {
    return { data: await this.entities.archivePlayer(slug, request.auth!.id, request) };
  }
}
