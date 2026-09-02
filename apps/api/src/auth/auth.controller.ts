import { Body, Controller, Get, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { HttpRequest, HttpResponse } from '../http.types';
import { AuthService } from './auth.service';
import { AuthRateLimitGuard, CsrfGuard, SessionGuard } from './auth.guards';
import type { AuthenticatedRequest } from './auth.types';
import { parseLogin, parseRegistration } from './auth.validation';

@Controller('api/v1/auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post('register')
  @UseGuards(CsrfGuard, AuthRateLimitGuard)
  async register(
    @Body() body: unknown,
    @Req() request: HttpRequest,
    @Res({ passthrough: true }) response: HttpResponse,
  ) {
    const result = await this.auth.register(parseRegistration(body), request);
    this.auth.setSessionCookie(response, result.token);
    return { data: result.user };
  }

  @Post('login')
  @UseGuards(CsrfGuard, AuthRateLimitGuard)
  async login(
    @Body() body: unknown,
    @Req() request: HttpRequest,
    @Res({ passthrough: true }) response: HttpResponse,
  ) {
    const result = await this.auth.login(parseLogin(body), request);
    this.auth.setSessionCookie(response, result.token);
    return { data: result.user };
  }

  @Get('me')
  @UseGuards(SessionGuard)
  me(@Req() request: AuthenticatedRequest) {
    return { data: request.auth };
  }

  @Post('logout')
  @UseGuards(CsrfGuard, SessionGuard)
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: HttpResponse,
  ) {
    await this.auth.logout(request);
    this.auth.clearSessionCookie(response);
    return { data: { loggedOut: true } };
  }
}
