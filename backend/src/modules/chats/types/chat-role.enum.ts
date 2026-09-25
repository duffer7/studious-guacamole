/** Роль участника чата. Колонка `chat_members.role` — varchar(16), миграция типа не нужна. */
export enum ChatRole {
  owner = 'owner',
  admin = 'admin',
  member = 'member',
}

export function canManageMembers(role: string): boolean {
  return role === ChatRole.owner || role === ChatRole.admin;
}
