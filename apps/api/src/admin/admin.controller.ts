import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RequirePermissions } from '../auth/auth.decorators';
import { CsrfGuard, PermissionsGuard, SessionGuard } from '../auth/auth.guards';
import type { AuthenticatedRequest } from '../auth/auth.types';
import type { HttpRequest } from '../http.types';
import { AdminService } from './admin.service';
import {
  parseAchievementUpdate,
  parseAdminListQuery,
  parseAdminResource,
  parseArchive,
  parseAssertion,
  parseAssertionDecision,
  parseEntityType,
  parseFederationReviewer,
  parseImport,
  parseOrganization,
  parseResolution,
  parseRoleAssignment,
  parseTournament,
  parseUserStatus,
} from './admin.validation';

@Controller('api/v1/admin')
export class AdminController {
  constructor(@Inject(AdminService) private readonly admin: AdminService) {}

  @Get('overview')
  @RequirePermissions('admin.read')
  @UseGuards(SessionGuard, PermissionsGuard)
  overview() {
    return this.admin.overview();
  }

  @Get('resources/:resource')
  @RequirePermissions('admin.read')
  @UseGuards(SessionGuard, PermissionsGuard)
  resources(
    @Param('resource') resource: string,
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.admin.listResource(parseAdminResource(resource), parseAdminListQuery(query));
  }

  @Post('tournaments')
  @RequirePermissions('tournament.manage')
  @UseGuards(CsrfGuard, SessionGuard, PermissionsGuard)
  async createTournament(
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest & HttpRequest,
  ) {
    return {
      data: await this.admin.createTournament(parseTournament(body), request.auth!.id, request),
    };
  }

  @Patch('tournaments/:id')
  @RequirePermissions('tournament.manage')
  @UseGuards(CsrfGuard, SessionGuard, PermissionsGuard)
  async updateTournament(
    @Param('id') id: string,
    @Headers('if-match') ifMatch: string | undefined,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest & HttpRequest,
  ) {
    return {
      data: await this.admin.updateTournament(
        id,
        parseTournament(body),
        ifMatch,
        request.auth!.id,
        request,
      ),
    };
  }

  @Post('organizations')
  @RequirePermissions('organization.manage')
  @UseGuards(CsrfGuard, SessionGuard, PermissionsGuard)
  async createOrganization(
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest & HttpRequest,
  ) {
    return {
      data: await this.admin.createOrganization(parseOrganization(body), request.auth!.id, request),
    };
  }

  @Patch('organizations/:id')
  @RequirePermissions('organization.manage')
  @UseGuards(CsrfGuard, SessionGuard, PermissionsGuard)
  async updateOrganization(
    @Param('id') id: string,
    @Headers('if-match') ifMatch: string | undefined,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest & HttpRequest,
  ) {
    return {
      data: await this.admin.updateOrganization(
        id,
        parseOrganization(body),
        ifMatch,
        request.auth!.id,
        request,
      ),
    };
  }

  @Post('assertions')
  @RequirePermissions('assertion.manage')
  @UseGuards(CsrfGuard, SessionGuard, PermissionsGuard)
  async createAssertion(@Body() body: unknown, @Req() request: AuthenticatedRequest & HttpRequest) {
    return {
      data: await this.admin.createAssertion(parseAssertion(body), request.auth!.id, request),
    };
  }

  @Post('assertions/:id/resolve')
  @RequirePermissions('assertion.manage')
  @UseGuards(CsrfGuard, SessionGuard, PermissionsGuard)
  async resolveAssertion(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest & HttpRequest,
  ) {
    return {
      data: await this.admin.resolveAssertion(
        id,
        parseAssertionDecision(body),
        request.auth!.id,
        request,
      ),
    };
  }

  @Post('imports')
  @RequirePermissions('import.manage')
  @UseGuards(CsrfGuard, SessionGuard, PermissionsGuard)
  async createImport(@Body() body: unknown, @Req() request: AuthenticatedRequest & HttpRequest) {
    return { data: await this.admin.createImport(parseImport(body), request.auth!.id, request) };
  }

  @Post('imports/:id/retry')
  @RequirePermissions('import.manage')
  @UseGuards(CsrfGuard, SessionGuard, PermissionsGuard)
  async retryImport(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest & HttpRequest,
  ) {
    const input = parseResolution(body);
    return { data: await this.admin.retryImport(id, input.resolution, request.auth!.id, request) };
  }

  @Post('reports/:id/resolve')
  @RequirePermissions('report.manage')
  @UseGuards(CsrfGuard, SessionGuard, PermissionsGuard)
  async resolveReport(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest & HttpRequest,
  ) {
    const input = parseResolution(body);
    return {
      data: await this.admin.resolveReport(id, input.resolution, request.auth!.id, request),
    };
  }

  @Post('users/:id/roles')
  @RequirePermissions('role.manage')
  @UseGuards(CsrfGuard, SessionGuard, PermissionsGuard)
  async roles(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest & HttpRequest,
  ) {
    return {
      data: await this.admin.assignRoles(id, parseRoleAssignment(body), request.auth!.id, request),
    };
  }

  @Post('federations/:federationId/reviewer')
  @RequirePermissions('role.manage')
  @UseGuards(CsrfGuard, SessionGuard, PermissionsGuard)
  async federationReviewer(
    @Param('federationId') federationId: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest & HttpRequest,
  ) {
    const input = parseFederationReviewer(body);
    return {
      data: await this.admin.setFederationReviewer(
        federationId,
        input.userId,
        input,
        request.auth!.id,
        request,
      ),
    };
  }

  @Patch('users/:id/status')
  @RequirePermissions('admin.user.manage')
  @UseGuards(CsrfGuard, SessionGuard, PermissionsGuard)
  async userStatus(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest & HttpRequest,
  ) {
    return {
      data: await this.admin.updateUserStatus(id, parseUserStatus(body), request.auth!.id, request),
    };
  }

  @Patch('achievements/:id')
  @RequirePermissions('achievement.manage')
  @UseGuards(CsrfGuard, SessionGuard, PermissionsGuard)
  async achievement(
    @Param('id') id: string,
    @Headers('if-match') ifMatch: string | undefined,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest & HttpRequest,
  ) {
    return {
      data: await this.admin.updateAchievement(
        id,
        parseAchievementUpdate(body),
        ifMatch,
        request.auth!.id,
        request,
      ),
    };
  }

  @Post('entities/:type/:id/archive')
  @RequirePermissions('admin.archive')
  @UseGuards(CsrfGuard, SessionGuard, PermissionsGuard)
  async archive(
    @Param('type') type: string,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest & HttpRequest,
  ) {
    const input = parseArchive(body);
    return {
      data: await this.admin.archiveEntity(
        parseEntityType(type),
        id,
        input.reason,
        request.auth!.id,
        request,
      ),
    };
  }
}
