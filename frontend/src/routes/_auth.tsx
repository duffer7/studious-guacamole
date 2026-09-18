import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import { store } from '@/store';

export const Route = createFileRoute('/_auth')({
  beforeLoad: () => {
    const { status } = store.getState().auth;

    if (status === 'authenticated') {
      throw redirect({
        to: '/chats',
      });
    }
  },
  component: GuestLayout,
});

function GuestLayout() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Outlet />
    </div>
  );
}
