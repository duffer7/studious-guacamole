import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppDispatch } from '@/store/hooks';
import { setCredentials, setUser } from '@features/auth/auth.slice';
import { setTokens } from '@/api/client';
import { getMe, login } from '@features/auth/api';
import { disconnectSocket } from '@features/chats/socket';
import { syncSubscription } from '@features/notifications/push';
import type { LoginDto, LoginResult, MfaRequired } from '@features/auth/types';
import { useNavigate } from '@tanstack/react-router';

export type LoginStep = 'credentials' | 'mfa';

function isMfaRequired(result: LoginResult): result is MfaRequired {
  return 'mfaRequired' in result;
}

export function useLogin() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<LoginStep>('credentials');
  const [pending, setPending] = useState<{ username: string; password: string } | null>(null);

  const mutation = useMutation({
    mutationFn: async (dto: LoginDto): Promise<LoginResult | null> => {
      const result = await login(dto);
      if (isMfaRequired(result)) return result;
      setTokens({
        accessToken: result.access_token,
        refreshToken: result.refresh_token,
      });
      // новый пользователь — не тащим данные прошлой сессии:
      // сбрасываем кэш и пересоздаём сокет с новым токеном
      disconnectSocket();
      queryClient.clear();

      // токены уже сохранены, поэтому getMe пройдёт авторизованно;
      // без этого user остаётся null и страница чатов не отрендерится
      const user = await getMe();

      dispatch(
        setCredentials({ accessToken: result.access_token, refreshToken: result.refresh_token }),
      );
      dispatch(setUser(user));
      void syncSubscription().catch(() => undefined);

      return result;
    },
    onSuccess: (result, dto) => {
      if (result && isMfaRequired(result)) {
        setPending({ username: dto.username, password: dto.password });
        setStep('mfa');
        return;
      }

      setStep('credentials');
      setPending(null);

      navigate({ to: '/chats' });
    },
  });

  function submitCredentials(username: string, password: string) {
    mutation.mutate({ username, password });
  }

  function submitMfa(code: string) {
    if (!pending) return;
    mutation.mutate({ ...pending, code });
  }

  function backToCredentials() {
    setStep('credentials');
    setPending(null);
    mutation.reset();
  }

  return {
    step,
    submitCredentials,
    submitMfa,
    backToCredentials,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
