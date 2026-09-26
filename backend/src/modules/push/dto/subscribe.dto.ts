import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsUrl, MaxLength, MinLength, ValidateNested } from 'class-validator';

export class PushKeysDto {
  @ApiProperty({ example: 'BNc...' })
  @IsString()
  @MinLength(10)
  @MaxLength(255)
  p256dh!: string;

  @ApiProperty({ example: 'tBH...' })
  @IsString()
  @MinLength(8)
  @MaxLength(255)
  auth!: string;
}

export class SubscribeDto {
  @ApiProperty({ example: 'https://fcm.googleapis.com/fcm/send/...' })
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  endpoint!: string;

  @ApiProperty({ type: PushKeysDto })
  @ValidateNested()
  @Type(() => PushKeysDto)
  keys!: PushKeysDto;
}
