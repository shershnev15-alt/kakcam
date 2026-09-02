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
import { parseCreateTeam, parseUpdateTeam } from './entities.validation';

@Controller('api/v1/teams')
export class TeamsController {
  constructor(@Inject(EntitiesService) private readonly entities: EntitiesService) {}

  @Get()
  async list(@Query() query: Record<string, string | undefined>) {
    return this.entities.listTeams(parseDirectoryQuery(query));
  }

  @Get(':slug')
  async detail(@Param('slug') slug: string) {
    return { data: await this.entities.teamBySlug(slug), meta: { source: 'postgresql' } };
  }

  @Post()
  @RequirePermissions('team.create')
  @UseGuards(CsrfGuard, SessionGuard, PermissionsGuard)
  async create(@Body() body: unknown, @Req() request: AuthenticatedRequest & HttpRequest) {
    return {
      data: await this.entities.createTeam(parseCreateTeam(body), request.auth!.id, request),
    };
  }

  @Patch(':slug')
  @RequirePermissions('team.update')
  @UseGuards(CsrfGuard, SessionGuard, PermissionsGuard)
  async update(
    @Param('slug') slug: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest & HttpRequest,
  ) {
    return {
      data: await this.entities.updateTeam(slug, parseUpdateTeam(body), request.auth!.id, request),
    };
  }

  @Delete(':slug')
  @RequirePermissions('team.archive')
  @UseGuards(CsrfGuard, SessionGuard, PermissionsGuard)
  async archive(@Param('slug') slug: string, @Req() request: AuthenticatedRequest & HttpRequest) {
    return { data: await this.entities.archiveTeam(slug, request.auth!.id, request) };
  }
}
