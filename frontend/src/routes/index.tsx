import { createFileRoute, redirect } from '@tanstack/react-router';
import { store } from '@/store';

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    const { status } = store.getState().auth;
    throw redirect({ to: status === 'authenticated' ? '/chats' : '/auth/login' });
  },
});
