import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../auth/auth.decorators';
import { CsrfGuard, PermissionsGuard, SessionGuard } from '../auth/auth.guards';
import type { AuthenticatedRequest } from '../auth/auth.types';
import type { HttpRequest } from '../http.types';
import {
  parseClaimDecision,
  parseClaimEvidence,
  parseModerationQuery,
  parsePublicationDecision,
  parseSubmitClaim,
} from './verification.validation';
import { VerificationService } from './verification.service';

@Controller('api/v1')
export class VerificationController {
  constructor(@Inject(VerificationService) private readonly verification: VerificationService) {}

  @Get('players/:slug/verification')
  async playerVerification(@Param('slug') slug: string) {
    return {
      data: await this.verification.playerVerification(slug),
      meta: { source: 'postgresql' },
    };
  }

  @Post('claims')
  @UseGuards(CsrfGuard, SessionGuard)
  async submit(@Body() body: unknown, @Req() request: AuthenticatedRequest & HttpRequest) {
    return {
      data: await this.verification.submitClaim(parseSubmitClaim(body), request.auth!.id, request),
    };
  }

  @Get('claims/me')
  @UseGuards(SessionGuard)
  async mine(@Req() request: AuthenticatedRequest) {
    return { data: await this.verification.myClaims(request.auth!.id) };
  }

  @Post('claims/:id/evidence')
  @UseGuards(CsrfGuard, SessionGuard)
  async evidence(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest & HttpRequest,
  ) {
    return {
      data: await this.verification.addEvidence(
        id,
        parseClaimEvidence(body),
        request.auth!.id,
        request,
      ),
    };
  }

  @Get('moderation/claims')
  @RequirePermissions('claim.review')
  @UseGuards(SessionGuard, PermissionsGuard)
  async queue(@Query() query: Record<string, string | undefined>) {
    return { data: await this.verification.moderationQueue(parseModerationQuery(query).status) };
  }

  @Post('moderation/claims/:id/decision')
  @RequirePermissions('claim.review')
  @UseGuards(CsrfGuard, SessionGuard, PermissionsGuard)
  async decision(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest & HttpRequest,
  ) {
    return {
      data: await this.verification.decideClaim(
        id,
        parseClaimDecision(body),
        request.auth!.id,
        request,
      ),
    };
  }

  @Post('moderation/players/:slug/publication')
  @RequirePermissions('player.publish')
  @UseGuards(CsrfGuard, SessionGuard, PermissionsGuard)
  async publication(
    @Param('slug') slug: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest & HttpRequest,
  ) {
    return {
      data: await this.verification.decidePublication(
        slug,
        parsePublicationDecision(body),
        request.auth!.id,
        request,
      ),
    };
  }
}
