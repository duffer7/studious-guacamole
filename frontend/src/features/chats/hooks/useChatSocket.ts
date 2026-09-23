import { useEffect } from 'react';
import { connectSocket, disconnectSocket } from '@features/chats/socket';

/**
 * Устанавливает WS-соединение на время нахождения в авторизованной зоне
 * и разрывает его при размонтировании (выход из аккаунта/навигация вне layout'а).
 */
export function useChatSocket() {
  useEffect(() => {
    void connectSocket().catch((err: Error) => {
      console.warn('[ws] connect failed:', err?.message ?? err);
      /* reconnection: true автоматически повторит попытку */
    });

    return () => {
      disconnectSocket();
    };
  }, []);
}
