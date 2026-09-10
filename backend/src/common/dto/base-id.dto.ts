import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class BaseIdDto {
  @ApiProperty({ example: 1, description: 'Уникальный идентификатор сущности' })
  @IsInt()
  @IsPositive()
  id: number;
}
