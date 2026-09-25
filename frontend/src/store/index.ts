import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@features/auth/auth.slice';
import presenceReducer from '@features/chats/presence/presence.slice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    presence: presenceReducer,
  },
  // middleware: (gDM) => gDM().concat(socketMiddleware)
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
