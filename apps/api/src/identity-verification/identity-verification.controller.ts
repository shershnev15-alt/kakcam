import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { CsrfGuard, SessionGuard } from '../auth/auth.guards';
import type { AuthenticatedRequest } from '../auth/auth.types';
import type { HttpRequest } from '../http.types';
import { IdentityVerificationService } from './identity-verification.service';

type RawRequest = RawBodyRequest<{
  rawBody?: Buffer;
  headers: Record<string, string | string[] | undefined>;
}>;

@Controller('api/v1')
export class IdentityVerificationController {
  constructor(
    @Inject(IdentityVerificationService)
    private readonly identityVerification: IdentityVerificationService,
  ) {}

  @Post('identity/session')
  @UseGuards(CsrfGuard, SessionGuard)
  async createSession(@Body() body: { claimId?: unknown }, @Req() request: AuthenticatedRequest) {
    if (typeof body.claimId !== 'string' || !body.claimId.trim()) {
      throw new BadRequestException('claimId обязателен');
    }
    return {
      data: await this.identityVerification.createSession(body.claimId, request.auth!.id),
    };
  }

  @Get('identity/status')
  @UseGuards(SessionGuard)
  async status(@Req() request: AuthenticatedRequest) {
    return { data: await this.identityVerification.statusForUser(request.auth!.id) };
  }

  @Post('webhooks/sumsub')
  async sumsub(@Req() request: RawRequest & HttpRequest) {
    if (!request.rawBody) throw new Error('Raw webhook body unavailable');
    return {
      data: await this.identityVerification.handleSumsubWebhook(request.rawBody, request.headers),
    };
  }
}
