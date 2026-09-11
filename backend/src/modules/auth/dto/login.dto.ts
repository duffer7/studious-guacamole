import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'duffer7', description: 'Имя пользователя' })
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  username!: string;

  @ApiProperty({ example: 's3cr3t-password', description: 'Пароль пользователя' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiProperty({
    example: '123456',
    required: false,
    description: 'MFA код, если MFA включён',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  code?: string;
}
