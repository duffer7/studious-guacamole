import { PrismaService } from "@services/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { ResponseUserDto } from "@modules/user/dto/response-user.dto";
// import { CreateUserDto } from '@modules/user/dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // create(dto: CreateUserDto) {
  //   const user = { id: Date.now(), ...dto };
  //   this.users.push(user);
  //   return user;
  // }

  async findAll(): Promise<ResponseUserDto[] | undefined> {
    try {
      const users = await this.prisma.db.orm.public.User.all();

      return users.map(
        (user) =>
          new ResponseUserDto({
            id: user.id,
            email: user.email,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            createdAt: user.createdAt,
          }),
      );
    } catch (error) {
      console.log(error);
    }
  }

  // findOne(id: number) {
  //   return this.users.find(user => user.id === id);
  // }
}
