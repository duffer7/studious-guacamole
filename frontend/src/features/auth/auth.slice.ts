import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@/features/auth/types';
import { getAccessToken, getRefreshToken } from '@/api/client';
import { getMe } from '@/features/auth/api';
import type { RootState } from '@/store';

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

export const selectUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) => state.auth.status === 'authenticated';

export const bootstrapAuth = createAsyncThunk('auth/bootstrap', async (_, { dispatch }) => {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();
  if (!accessToken || !refreshToken) {
    return;
  }

  const user = await getMe();
  dispatch(setUser(user));
  dispatch(setCredentials({ accessToken, refreshToken }));
});

export const { setCredentials, setUser, logout } = authSlice.actions;
export default authSlice.reducer;
