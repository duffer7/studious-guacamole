import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import { store } from '@/store';
import { useEffect } from 'react';
import { useChatSocket } from '@features/chats/hooks/useChatSocket';
import { CallProvider } from '@features/calls/CallProvider';
import { CallOverlay } from '@features/calls/CallOverlay';
import { useNotificationClick } from '@features/notifications/useNotificationClick';
import { syncSubscription } from '@features/notifications/push';

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
  // держим WS-соединение открытым на протяжении всей авторизованной зоны
  useChatSocket();
  useNotificationClick();

  useEffect(() => {
    void syncSubscription().catch(() => undefined);
  }, []);

  return (
    <CallProvider>
      <div className="min-h-dvh bg-background text-foreground">
        <Outlet />
        <CallOverlay />
      </div>
    </CallProvider>
  );
}
