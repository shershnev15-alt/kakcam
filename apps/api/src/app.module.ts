import { Module } from '@nestjs/common';
import { AdminController } from './admin/admin.controller';
import { AdminService } from './admin/admin.service';
import { AppController } from './app.controller';
import { AuthController } from './auth/auth.controller';
import { AuthRateLimitGuard, CsrfGuard, PermissionsGuard, SessionGuard } from './auth/auth.guards';
import { AuthRateLimitService } from './auth/auth-rate-limit.service';
import { AuthService } from './auth/auth.service';
import { EmailDeliveryService } from './auth/email-delivery.service';
import { CareerController } from './career/career.controller';
import { CareerService } from './career/career.service';
import { CompetitionController } from './competition/competition.controller';
import { CompetitionService } from './competition/competition.service';
import { DatabaseService } from './database.service';
import { EntitiesService } from './entities/entities.service';
import { DirectoryController } from './entities/directory.controller';
import { PlayersController } from './entities/players.controller';
import { TeamsController } from './entities/teams.controller';
import { PrismaService } from './prisma.service';
import { ImportsController } from './imports/imports.controller';
import { ImportsService } from './imports/imports.service';
import { MetricsGuard } from './observability/observability.guard';
import { ObservabilityController } from './observability/observability.controller';
import { ObservabilityService } from './observability/observability.service';
import { RatingsController } from './ratings/ratings.controller';
import { RatingsService } from './ratings/ratings.service';
import { VerificationController } from './verification/verification.controller';
import { VerificationService } from './verification/verification.service';
import { GameAccountsController } from './game-accounts/game-accounts.controller';
import { GameAccountsService } from './game-accounts/game-accounts.service';
import { EvidenceStorageService } from './verification/evidence-storage.service';
import { IdentityVerificationController } from './identity-verification/identity-verification.controller';
import { IdentityVerificationService } from './identity-verification/identity-verification.service';

@Module({
  controllers: [
    AdminController,
    AppController,
    AuthController,
    CareerController,
    CompetitionController,
    DirectoryController,
    PlayersController,
    RatingsController,
    TeamsController,
    VerificationController,
    ImportsController,
    GameAccountsController,
    ObservabilityController,
    IdentityVerificationController,
  ],
  providers: [
    AdminService,
    PrismaService,
    DatabaseService,
    AuthService,
    EmailDeliveryService,
    SessionGuard,
    PermissionsGuard,
    CsrfGuard,
    AuthRateLimitGuard,
    EntitiesService,
    AuthRateLimitService,
    CompetitionService,
    RatingsService,
    CareerService,
    VerificationService,
    ImportsService,
    GameAccountsService,
    EvidenceStorageService,
    IdentityVerificationService,
    MetricsGuard,
    ObservabilityService,
  ],
})
export class AppModule {}
