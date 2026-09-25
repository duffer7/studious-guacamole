import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface PresenceEntry {
  online: boolean;
  lastSeenAt: string | null;
}

interface PresenceState {
  byUserId: Record<number, PresenceEntry>;
}

const initialState: PresenceState = { byUserId: {} };

const presenceSlice = createSlice({
  name: 'presence',
  initialState,
  reducers: {
    setPresence: (
      state,
      action: PayloadAction<{ userId: number; online: boolean; lastSeenAt?: string | null }>,
    ) => {
      const previous = state.byUserId[action.payload.userId];
      const lastSeenAt = action.payload.online
        ? (previous?.lastSeenAt ?? null)
        : (action.payload.lastSeenAt ?? previous?.lastSeenAt ?? null);
      state.byUserId[action.payload.userId] = {
        online: action.payload.online,
        lastSeenAt,
      };
    },
  },
});

export const { setPresence } = presenceSlice.actions;
export default presenceSlice.reducer;
