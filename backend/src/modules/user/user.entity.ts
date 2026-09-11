import { BaseIdDto } from "@common/dto/base-id.dto";
import { ApiProperty } from "@nestjs/swagger";

export class CreateUserDto extends BaseIdDto {
  @ApiProperty({ example: "duffer7", description: "username пользователя" })
  username: string;

  @ApiProperty({ example: "s", description: "пароль пользователя" })
  password: string;

  @ApiProperty({ example: "Artemii", description: "Имя пользователя" })
  name: string;

  @ApiProperty({ example: "artemii@example.com", description: "Email пользователя" })
  email: string;
}
