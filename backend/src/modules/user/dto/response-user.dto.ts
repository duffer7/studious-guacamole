import { ApiProperty } from "@nestjs/swagger";
import { ResponseUserType } from "@modules/user/types/response-user.type";
import { BaseIdDto } from "@common/dto/base-id.dto";

export class ResponseUserDto extends BaseIdDto {
  @ApiProperty({ example: "user@example.com" })
  email: string;

  @ApiProperty({ example: "artemii" })
  username: string;

  @ApiProperty({ example: "Артемий", nullable: true })
  displayName: string | null;

  @ApiProperty({ example: "https://example.com/avatar.png", nullable: true })
  avatarUrl: string | null;

  @ApiProperty({ example: "2026-09-10T11:25:00Z" })
  createdAt: string;

  // @ApiProperty({ example: '2026-09-10T11:30:00Z' })
  // updatedAt: Date;

  constructor({ id, email, username, displayName, avatarUrl, createdAt }: ResponseUserType) {
    super();
    this.id = id;
    this.email = email;
    this.username = username;
    this.displayName = displayName;
    this.avatarUrl = avatarUrl;
    this.createdAt = createdAt;
  }
}
