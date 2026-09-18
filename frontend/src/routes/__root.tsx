import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { QueryClient } from '@tanstack/react-query';
import { Navbar } from '@components/Navbar';
import { selectIsAuthenticated } from '@features/auth/auth.slice';
import { useAppSelector } from '@/store/hooks';

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  authIsReady: Promise<unknown>;
}>()({
  component: RootComponent,
  notFoundComponent: () => {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2">
        <p className="text-muted-foreground">Страница не найдена</p>
      </div>
    );
  },
});

function RootComponent() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  return (
    <>
      {isAuthenticated ? <Navbar></Navbar> : ''}
      <Outlet />
      <ReactQueryDevtools buttonPosition="top-right" />
      <TanStackRouterDevtools position="bottom-right" />
    </>
  );
}
