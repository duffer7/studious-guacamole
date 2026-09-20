import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class GetMessagesDto {
  // Keyset-пагинация: сообщения строго старше этого id.
  @ApiPropertyOptional({ example: 500, description: 'Вернуть сообщения с id < before' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  before?: number;

  @ApiPropertyOptional({ example: 50, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}
