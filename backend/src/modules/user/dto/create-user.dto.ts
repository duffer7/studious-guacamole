import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'duffer7', description: 'Уникальный username пользователя' })
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  username!: string;

  @ApiProperty({ example: 's3cr3t-password', description: 'Пароль пользователя' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiProperty({ example: 'artemii@example.com', description: 'Email пользователя' })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'Артемий',
    required: false,
    description: 'Отображаемое имя',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  displayName?: string;
}
