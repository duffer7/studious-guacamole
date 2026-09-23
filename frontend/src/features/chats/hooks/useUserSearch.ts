import { useQuery } from '@tanstack/react-query';
import { searchUsers } from '@features/chats/api';

/** Поиск пользователей по строке (минимум 2 символа). */
export function useUserSearch(query: string) {
  const trimmed = query.trim();

  return useQuery({
    queryKey: ['users', 'search', trimmed],
    queryFn: () => searchUsers(trimmed),
    enabled: trimmed.length >= 2,
    staleTime: 30_000,
  });
}
