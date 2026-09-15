import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@/features/auth/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  status: 'idle' | 'loading' | 'authenticated';
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  status: 'idle',
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /** Сохраняет токены и помечает сессию активной. Профиль грузится отдельно. */
    setCredentials: (s, a: PayloadAction<{ accessToken: string; refreshToken: string }>) => {
      s.accessToken = a.payload.accessToken;
      s.refreshToken = a.payload.refreshToken;
      s.status = 'authenticated';
    },
    /** Кладёт загруженный профиль пользователя. */
    setUser: (s, a: PayloadAction<User>) => {
      s.user = a.payload;
    },
    logout: () => initialState,
  },
});

export const { setCredentials, setUser, logout } = authSlice.actions;
export default authSlice.reducer;
