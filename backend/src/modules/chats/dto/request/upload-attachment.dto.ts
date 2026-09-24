import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UploadAttachmentDto {
  @ApiProperty({ example: 'photo.jpg' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  @MaxLength(128)
  mime!: string;

  @ApiProperty({ description: 'Файл в base64, без data-URL префикса' })
  @IsString()
  @MaxLength(12_000_000)
  data!: string;
}
