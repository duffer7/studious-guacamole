import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@features/auth/types';
import { getAccessToken, getRefreshToken, setTokens } from '@/api/client';
import { getMe, logout as logoutApi, logoutAll as logoutAllApi } from '@features/auth/api';
import type { RootState } from '@/store';
import { useNavigate } from '@tanstack/react-router';

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
    setCredentials: (s, a: PayloadAction<{ accessToken: string; refreshToken: string }>) => {
      s.accessToken = a.payload.accessToken;
      s.refreshToken = a.payload.refreshToken;
      s.status = 'authenticated';
    },
    setUser: (s, a: PayloadAction<User>) => {
      s.user = a.payload;
    },
    logout: () => initialState,
    logoutAll: () => initialState,
  },
});

export const logoutUser = createAsyncThunk('auth/logout/remote', async (_, { dispatch }) => {
  try {
    await logoutApi();
  } finally {
    setTokens({ accessToken: null, refreshToken: null });
    dispatch(authSlice.actions.logout());
  }
});

export const logoutAllUser = createAsyncThunk('auth/logoutAll/remote', async (_, { dispatch }) => {
  try {
    await logoutAllApi();
  } finally {
    setTokens({ accessToken: null, refreshToken: null });
    dispatch(authSlice.actions.logoutAll());
  }
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

export const { setCredentials, setUser, logout, logoutAll } = authSlice.actions;
export default authSlice.reducer;
