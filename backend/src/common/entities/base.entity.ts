import { ApiProperty } from '@nestjs/swagger';

export abstract class BaseEntity {
  @ApiProperty({ example: 1, description: 'Уникальный идентификатор сущности' })
  id: number;
}
