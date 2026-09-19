import { type Database, DB } from '@db/db.provider';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class MessagesRepository {
  constructor(@Inject(DB) private readonly db: Database) {}
}
