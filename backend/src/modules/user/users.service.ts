import { Injectable } from '@nestjs/common';
import { CreateUserDto } from '@modules/user/dto/create-user.dto';

@Injectable()
export class UsersService {
  private users = [];

  create(dto: CreateUserDto) {
    const user = { id: Date.now(), ...dto };
    this.users.push(user);
    return user;
  }

  findAll() {
    return this.users;
  }

  findOne(id: number) {
    return this.users.find(user => user.id === id);
  }
}
