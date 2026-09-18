import '@/index.css';
import { StrictMode } from 'react';
import { Provider } from 'react-redux';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { routeTree } from '@/routeTree.gen';
import { store } from '@/store';
import { setOnUnauthorized, setTokens } from '@/api/client';
import { bootstrapAuth } from '@features/auth/auth.slice';

const queryClient = new QueryClient();

const authIsReady = store.dispatch(bootstrapAuth());

const router = createRouter({
  routeTree,
  context: {
    queryClient,
    authIsReady,
  },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

setOnUnauthorized(() => {
  setTokens({ accessToken: null, refreshToken: null });
  store.dispatch({ type: 'auth/logout' });
  void router.invalidate();
});

// Ждём восстановления сессии до первого рендера, чтобы не мигать экраном логина.
await authIsReady;
const rootElement = document.getElementById('app')!;

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </Provider>
    </StrictMode>,
  );
}
