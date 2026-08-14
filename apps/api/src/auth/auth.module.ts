import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { TokenService } from './token.service.js';
import { UsersRepository } from './users.repository.js';
import { InvitesRepository } from './invites.repository.js';

@Module({
  controllers: [AuthController],
  providers: [AuthService, TokenService, UsersRepository, InvitesRepository],
  // The global JwtAuthGuard resolves these, so they must leave the module.
  exports: [TokenService, UsersRepository],
})
export class AuthModule {}
