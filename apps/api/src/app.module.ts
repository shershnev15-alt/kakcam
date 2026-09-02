import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthController } from './auth/auth.controller';
import { AuthRateLimitGuard, CsrfGuard, PermissionsGuard, SessionGuard } from './auth/auth.guards';
import { AuthService } from './auth/auth.service';
import { DatabaseService } from './database.service';
import { EntitiesService } from './entities/entities.service';
import { PlayersController } from './entities/players.controller';
import { TeamsController } from './entities/teams.controller';
import { PrismaService } from './prisma.service';

@Module({
  controllers: [AppController, AuthController, PlayersController, TeamsController],
  providers: [
    PrismaService,
    DatabaseService,
    AuthService,
    SessionGuard,
    PermissionsGuard,
    CsrfGuard,
    AuthRateLimitGuard,
    EntitiesService,
  ],
})
export class AppModule {}
