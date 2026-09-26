import { useCallback } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { logoutAllUser, logoutUser } from '@features/auth/auth.slice';
import { useRouter } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { disconnectSocket } from '@features/chats/socket';
import { disablePush } from '@features/notifications/push';
import type { AsyncThunk } from '@reduxjs/toolkit';

export function useLogout() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const queryClient = useQueryClient();

  const run = useCallback(
    async (thunk: AsyncThunk<void, void, object>) => {
      try {
        await disablePush().catch(() => undefined);
        await dispatch(thunk()).unwrap();
      } finally {
        // рвём WS и вычищаем кэш прошлой сессии (чаты, сообщения, профиль),
        // иначе после входа могут показаться данные предыдущего пользователя
        disconnectSocket();
        queryClient.clear();
        await router.invalidate();
      }
    },
    [dispatch, router, queryClient],
  );

  return {
    logout: useCallback(() => run(logoutUser), [run]),
    logoutAll: useCallback(() => run(logoutAllUser), [run]),
  };
}
