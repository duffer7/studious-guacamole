import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from '@modules/user/users.service';
import { ResponseUserDto } from '@modules/user/dto/response-user.dto';
import { JwtAuthGuard } from '@modules/security/jwt-auth.guard';
import type { AuthUser } from '@modules/security/types';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Текущий пользователь' })
  @ApiOkResponse({ type: ResponseUserDto })
  async me(@Req() req: { user: AuthUser }): Promise<ResponseUserDto> {
    const user = await this.usersService.findById(req.user.userId);
    return new ResponseUserDto(user!);
  }
}
