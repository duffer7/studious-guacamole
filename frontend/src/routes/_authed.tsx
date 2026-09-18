import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import { store } from '@/store';

export const Route = createFileRoute('/_authed')({
  beforeLoad: async ({ location, context }) => {
    await context.authIsReady;
    const { status } = store.getState().auth;

    if (status !== 'authenticated') {
      throw redirect({
        to: '/auth/login',
        // Запомним, куда пользователь шёл, чтобы вернуть его после входа.
        search: { redirect: location.href },
      });
    }
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Outlet />
    </div>
  );
}
