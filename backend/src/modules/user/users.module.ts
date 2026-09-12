import { Module } from '@nestjs/common';
import { UsersService } from '@modules/user/users.service';
import { UsersRepository } from '@modules/user/users.repository';
import { UsersController } from '@modules/user/users.controller';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
