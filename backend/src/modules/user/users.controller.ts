import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from '@modules/user/users.service';
import { CreateUserDto } from '@modules/user/dto/create-user.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Создать пользователя' })
  @ApiResponse({ status: 201, description: 'Пользователь создан' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить всех пользователей' })
  @ApiResponse({ status: 200, description: 'Пользователь создан' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }
}
