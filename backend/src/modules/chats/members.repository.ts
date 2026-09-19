import { Injectable } from '@nestjs/common';

@Injectable()
export class MembersRepository {
  isMember(chatId: number, senderId: number): boolean {
    return false;
  }

  findByClientId(senderId: number, clientMessageId: number) {}
}
