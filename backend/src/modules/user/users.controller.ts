import { Body, Controller, Delete, Get, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UsersService } from '@modules/user/users.service';
import { ResponseUserDto } from '@modules/user/dto/response-user.dto';
import { PublicUserDto } from '@modules/user/dto/public-user.dto';
import { UpdateProfileDto, UploadAvatarDto } from '@modules/user/dto/update-profile.dto';
import { JwtAuthGuard } from '@modules/security/jwt-auth.guard';
import type { AuthUser } from '@modules/security/types';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Текущий пользователь' })
  @ApiOkResponse({ type: ResponseUserDto })
  async me(@Req() req: { user: AuthUser }): Promise<ResponseUserDto> {
    const user = await this.usersService.findById(req.user.userId);
    return new ResponseUserDto(user!);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Обновить отображаемое имя' })
  @ApiOkResponse({ type: ResponseUserDto })
  async updateMe(
    @Req() req: { user: AuthUser },
    @Body() dto: UpdateProfileDto,
  ): Promise<ResponseUserDto> {
    const user = await this.usersService.updateProfile(req.user.userId, dto.displayName);
    return new ResponseUserDto(user);
  }

  @Post('me/avatar')
  @ApiOperation({ summary: 'Загрузить аватар в MinIO' })
  @ApiOkResponse({ type: ResponseUserDto })
  async uploadAvatar(
    @Req() req: { user: AuthUser },
    @Body() dto: UploadAvatarDto,
  ): Promise<ResponseUserDto> {
    const user = await this.usersService.setAvatar(req.user.userId, dto.image);
    return new ResponseUserDto(user);
  }

  @Delete('me/avatar')
  @ApiOperation({ summary: 'Удалить аватар' })
  @ApiOkResponse({ type: ResponseUserDto })
  async deleteAvatar(@Req() req: { user: AuthUser }): Promise<ResponseUserDto> {
    const user = await this.usersService.clearAvatar(req.user.userId);
    return new ResponseUserDto(user);
  }

  @Get('search')
  @ApiOperation({ summary: 'Поиск пользователей по username/displayName' })
  @ApiQuery({ name: 'query', required: true, example: 'art' })
  @ApiOkResponse({ type: [PublicUserDto] })
  async search(
    @Req() req: { user: AuthUser },
    @Query('query') query: string,
  ): Promise<PublicUserDto[]> {
    const trimmed = (query ?? '').trim();
    if (trimmed.length < 2) return [];

    const users = await this.usersService.search(trimmed, req.user.userId);
    return users.map((u) => new PublicUserDto(u));
  }
}
