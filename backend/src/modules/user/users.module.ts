import { Module } from "@nestjs/common";
import { UsersService } from "@modules/user/users.service";
import { UsersController } from "@modules/user/users.controller";

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
