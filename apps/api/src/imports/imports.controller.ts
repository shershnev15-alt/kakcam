import { Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../auth/auth.decorators';
import { CsrfGuard, PermissionsGuard, SessionGuard } from '../auth/auth.guards';
import type { AuthenticatedRequest } from '../auth/auth.types';
import type { HttpRequest } from '../http.types';
import { ImportsService } from './imports.service';
import { parseImportApply, parseProviderImport } from './imports.validation';

@Controller('api/v1/admin/imports')
export class ImportsController {
  constructor(@Inject(ImportsService) private readonly imports: ImportsService) {}

  @Get('providers')
  @RequirePermissions('admin.read')
  @UseGuards(SessionGuard, PermissionsGuard)
  providers() {
    return this.imports.providers();
  }

  @Get(':id')
  @RequirePermissions('admin.read')
  @UseGuards(SessionGuard, PermissionsGuard)
  async detail(@Param('id') id: string) {
    return { data: await this.imports.getImport(id) };
  }

  @Post('provider')
  @RequirePermissions('import.manage')
  @UseGuards(CsrfGuard, SessionGuard, PermissionsGuard)
  async stage(@Body() body: unknown, @Req() request: AuthenticatedRequest & HttpRequest) {
    return {
      data: await this.imports.stage(parseProviderImport(body), request.auth!.id, request),
    };
  }

  @Post(':id/apply')
  @RequirePermissions('import.manage')
  @UseGuards(CsrfGuard, SessionGuard, PermissionsGuard)
  async apply(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest & HttpRequest,
  ) {
    const input = parseImportApply(body);
    return { data: await this.imports.apply(id, input.reason, request.auth!.id, request) };
  }
}
