import { createFileRoute } from '@tanstack/react-router';
import { ChatsPage } from '@pages/ChatsPage';

export const Route = createFileRoute('/_authed/chats')({
  component: ChatsPage,
});
