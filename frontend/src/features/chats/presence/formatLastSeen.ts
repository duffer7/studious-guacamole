/** Текст статуса офлайн-пользователя. Время сервера (UTC ISO) показывается в локальной зоне. */
export function formatLastSeen(
  lastSeenAt: string | null | undefined,
  online: boolean | null | undefined,
  now = new Date(),
): string {
  if (online === true) return 'в сети';
  if (online == null) return '';
  if (!lastSeenAt) return 'был(а) давно';

  const date = new Date(lastSeenAt);
  if (Number.isNaN(date.getTime())) return 'был(а) давно';

  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 60_000) return 'был(а) только что';
  if (diffMs < 60 * 60_000) {
    const minutes = Math.max(1, Math.floor(diffMs / 60_000));
    return `был(а) ${minutes} мин. назад`;
  }

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const time = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(date);

  if (date >= startOfToday) return `был(а) сегодня в ${time}`;
  if (date >= startOfYesterday) return `был(а) вчера в ${time}`;

  const day = new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
  return `был(а) ${day}`;
}
