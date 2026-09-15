import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAppDispatch } from '@/store/hooks';
import { setCredentials } from '@/features/auth/auth.slice';
import { setTokens } from '@/api/client';
import { login } from '@/features/auth/api';
import type { LoginDto, LoginResult, MfaRequired } from '@/features/auth/types';

export type LoginStep = 'credentials' | 'mfa';

function isMfaRequired(result: LoginResult): result is MfaRequired {
  return 'mfaRequired' in result;
}

export function useLogin() {
  const dispatch = useAppDispatch();
  const [step, setStep] = useState<LoginStep>('credentials');
  const [pending, setPending] = useState<{ username: string; password: string } | null>(null);

  const mutation = useMutation({
    mutationFn: (dto: LoginDto) => login(dto),
    onSuccess: (result, dto) => {
      if (isMfaRequired(result)) {
        setPending({ username: dto.username, password: dto.password });
        setStep('mfa');
        return;
      }

      setTokens({
        accessToken: result.access_token,
        refreshToken: result.refresh_token,
      });
      dispatch(
        setCredentials({
          accessToken: result.access_token,
          refreshToken: result.refresh_token,
        }),
      );
      setStep('credentials');
      setPending(null);
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
  };
}
