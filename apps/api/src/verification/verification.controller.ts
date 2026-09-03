import {
  Body,
  Controller,
  Get,
  Header,
  Inject,
  Param,
  Post,
  Query,
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
import { EvidenceStorageService, type UploadedEvidenceFile } from './evidence-storage.service';

@Controller('api/v1')
export class VerificationController {
  constructor(
    @Inject(VerificationService) private readonly verification: VerificationService,
    @Inject(EvidenceStorageService) private readonly evidenceStorage: EvidenceStorageService,
  ) {}

  @Get('players/:slug/verification')
  async playerVerification(@Param('slug') slug: string) {
    return {
      data: await this.verification.playerVerification(slug),
      meta: { source: 'postgresql' },
    };
  }

  @Get('media/players/:filename')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  async publicProfilePhoto(@Param('filename') filename: string) {
    const file = await this.evidenceStorage.publicProfilePhoto(filename);
    return new StreamableFile(file.buffer, {
      type: file.contentType,
      disposition: 'inline',
      length: file.buffer.length,
    });
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

  @Get('claims/onboarding')
  @UseGuards(SessionGuard)
  async onboarding(@Req() request: AuthenticatedRequest) {
    return { data: await this.verification.onboarding(request.auth!.id) };
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

  @Post('claims/:id/evidence/upload')
  @UseGuards(CsrfGuard, SessionGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { files: 1, fileSize: 15 * 1024 * 1024 } }))
  async uploadEvidence(
    @Param('id') id: string,
    @Body('kind') kind: string,
    @UploadedFile() file: UploadedEvidenceFile | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    return {
      data: await this.evidenceStorage.storeClaimEvidence(id, kind ?? '', file, request.auth!.id),
    };
  }

  @Get('moderation/claims')
  @RequirePermissions('claim.review')
  @UseGuards(SessionGuard, PermissionsGuard)
  async queue(@Query() query: Record<string, string | undefined>) {
    return { data: await this.verification.moderationQueue(parseModerationQuery(query).status) };
  }

  @Get('moderation/evidence/:id/content')
  @RequirePermissions('claim.review')
  @UseGuards(SessionGuard, PermissionsGuard)
  async evidenceContent(@Param('id') id: string) {
    const file = await this.evidenceStorage.content(id);
    return new StreamableFile(file.buffer, {
      type: file.contentType,
      disposition: `inline; filename="${file.originalName.replace(/["\\\r\n]/g, '_')}"`,
      length: file.buffer.length,
    });
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
