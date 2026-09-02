import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthController } from './auth/auth.controller';
import { AuthRateLimitGuard, CsrfGuard, PermissionsGuard, SessionGuard } from './auth/auth.guards';
import { AuthService } from './auth/auth.service';
import { CompetitionController } from './competition/competition.controller';
import { CompetitionService } from './competition/competition.service';
import { DatabaseService } from './database.service';
import { EntitiesService } from './entities/entities.service';
import { DirectoryController } from './entities/directory.controller';
import { PlayersController } from './entities/players.controller';
import { TeamsController } from './entities/teams.controller';
import { PrismaService } from './prisma.service';
import { RatingsController } from './ratings/ratings.controller';
import { RatingsService } from './ratings/ratings.service';

@Module({
  controllers: [
    AppController,
    AuthController,
    CompetitionController,
    DirectoryController,
    PlayersController,
    RatingsController,
    TeamsController,
  ],
  providers: [
    PrismaService,
    DatabaseService,
    AuthService,
    SessionGuard,
    PermissionsGuard,
    CsrfGuard,
    AuthRateLimitGuard,
    EntitiesService,
    CompetitionService,
    RatingsService,
  ],
})
export class AppModule {}
