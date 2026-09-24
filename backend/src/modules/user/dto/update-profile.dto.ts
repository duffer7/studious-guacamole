import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Артемий', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  displayName?: string | null;
}

export class UploadAvatarDto {
  @ApiPropertyOptional({ description: 'JPEG data URL' })
  @IsString()
  @MaxLength(2_000_000)
  image!: string;
}
