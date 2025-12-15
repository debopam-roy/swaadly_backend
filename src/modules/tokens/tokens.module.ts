import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { TokensService } from './tokens.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ConfigModule, JwtModule.register({}), PrismaModule],
  providers: [TokensService],
  exports: [TokensService],
})
export class TokensModule {}
