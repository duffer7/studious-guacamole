import { useCallback } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { logoutAllUser, logoutUser } from '@features/auth/auth.slice';
import { useRouter } from '@tanstack/react-router';
import type { AsyncThunk } from '@reduxjs/toolkit';

export function useLogout() {
  const dispatch = useAppDispatch();
  const router = useRouter();

  const run = useCallback(
    async (thunk: AsyncThunk<void, void, object>) => {
      try {
        await dispatch(thunk()).unwrap();
      } finally {
        await router.invalidate();
      }
    },
    [dispatch, router],
  );

  return {
    logout: useCallback(() => run(logoutUser), [run]),
    logoutAll: useCallback(() => run(logoutAllUser), [run]),
  };
}
