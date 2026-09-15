import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/features/auth/auth.slice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
  // middleware: (gDM) => gDM().concat(socketMiddleware)
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
