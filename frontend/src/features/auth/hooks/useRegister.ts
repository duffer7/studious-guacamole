import { useMutation } from '@tanstack/react-query';
import { register } from '@features/auth/api';
import type { RegisterDto } from '@features/auth/types';

export function useRegister() {
  const mutation = useMutation({
    mutationFn: (dto: RegisterDto) => register(dto),
  });

  return {
    submitRegister: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
