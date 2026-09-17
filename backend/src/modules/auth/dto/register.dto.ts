import { Match } from '@common/decorators/match.decorator';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'username', description: 'Имя пользователя' })
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  username!: string;

  @ApiProperty({ example: 's3cr3t-password', description: 'Пароль' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiProperty({ example: 's3cr3t-password', description: 'Повтор пароля' })
  @Match('password', { message: 'Passwords do not match' })
  passwordConfirm!: string;

  @ApiProperty({ example: 'me@example.com', description: 'Email пользователя' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Alice Daze', description: 'Имя пользователя' })
  @IsString()
  displayName!: string;
}
