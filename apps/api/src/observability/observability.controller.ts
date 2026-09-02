import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  PayloadTooLargeException,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { parseAnalyticsEvent } from './analytics.validation';
import { MetricsGuard } from './observability.guard';
import { ObservabilityService } from './observability.service';
import { analyticsClientHash } from './request-telemetry';

interface AnalyticsRequest {
  header(name: string): string | undefined;
  socket: { remoteAddress?: string };
}

@Controller()
export class ObservabilityController {
  constructor(@Inject(ObservabilityService) private readonly observability: ObservabilityService) {}

  @Get('metrics')
  @UseGuards(MetricsGuard)
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  metrics(): string {
    return this.observability.prometheus();
  }

  @Post('api/v1/analytics/events')
  @HttpCode(HttpStatus.ACCEPTED)
  analytics(@Body() body: unknown, @Req() request: AnalyticsRequest): { accepted: true } {
    const contentLength = Number(request.header('content-length') ?? 0);
    const parsedBytes = Buffer.byteLength(JSON.stringify(body) ?? '');
    if (contentLength > 4096 || parsedBytes > 4096)
      throw new PayloadTooLargeException('Analytics payload слишком большой');
    if (!this.observability.acceptAnalytics(analyticsClientHash(request))) {
      throw new HttpException('Analytics rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }
    this.observability.recordAnalytics(parseAnalyticsEvent(body));
    return { accepted: true };
  }
}
