import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class MfaDto {
  @ApiProperty({ example: '123456', description: '6-значный TOTP код' })
  @IsString()
  @Length(6, 6)
  code!: string;
}
