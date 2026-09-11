import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from '@modules/user/users.service';
import { CreateUserDto } from '@modules/user/dto/create-user.dto';
import { ResponseUserDto } from '@modules/user/dto/response-user.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Создать пользователя' })
  @ApiCreatedResponse({ type: ResponseUserDto, description: 'Пользователь создан' })
  async create(@Body() dto: CreateUserDto): Promise<ResponseUserDto> {
    const user = await this.usersService.create(dto);
    return new ResponseUserDto(user);
  }
  @Get()
  @ApiOperation({ summary: 'Получить всех пользователей' })
  @ApiOkResponse({ type: ResponseUserDto, isArray: true })
  async findAll(): Promise<ResponseUserDto[]> {
    const users = await this.usersService.findAll();
    return users.map((user) => new ResponseUserDto(user));
  }
}
