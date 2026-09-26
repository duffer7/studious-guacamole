let activeChatId: number | null = null;

export function setTrackedActiveChat(chatId: number | null): void {
  activeChatId = chatId;
}

export function getTrackedActiveChat(): number | null {
  return activeChatId;
}
