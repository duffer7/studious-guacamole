import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from '@modules/user/users.service';
import { CreateUserDto } from '@modules/user/dto/create-user.dto';
import { ResponseUserDto } from '@modules/user/dto/response-user.dto';
import { PublicUserDto } from '@modules/user/dto/public-user.dto';
import { JwtAuthGuard } from '@modules/security/jwt-auth.guard';
import type { AuthUser } from '@modules/security/types';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Регистрация пользователя (публичный)' })
  @ApiCreatedResponse({ type: ResponseUserDto, description: 'Пользователь создан' })
  async create(@Body() dto: CreateUserDto): Promise<ResponseUserDto> {
    const user = await this.usersService.create(dto);
    return new ResponseUserDto(user);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Текущий пользователь' })
  @ApiOkResponse({ type: ResponseUserDto })
  async me(@Req() req: { user: AuthUser }): Promise<ResponseUserDto> {
    const user = await this.usersService.findById(req.user.userId);
    return new ResponseUserDto(user!);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить всех пользователей' })
  @ApiOkResponse({ type: PublicUserDto, isArray: true })
  async findAll(): Promise<PublicUserDto[]> {
    const users = await this.usersService.findAll();
    return users.map((user) => new PublicUserDto(user));
  }
}
