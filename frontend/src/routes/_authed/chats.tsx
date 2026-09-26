import { createFileRoute } from '@tanstack/react-router';
import { ChatsPage } from '@pages/ChatsPage';

export const Route = createFileRoute('/_authed/chats')({
  validateSearch: (search: Record<string, unknown>): { c?: number } => {
    const raw = search.c;
    const value = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
    return Number.isInteger(value) && value > 0 ? { c: value } : {};
  },
  component: ChatsRoute,
});

function ChatsRoute() {
  const { c } = Route.useSearch();
  return <ChatsPage initialChatId={c} />;
}
