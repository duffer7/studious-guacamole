import { describe, expect, it } from 'vitest';
import { formatLastSeen } from './formatLastSeen';

const now = new Date(2026, 8, 24, 18, 0, 0);

describe('formatLastSeen', () => {
  it('показывает онлайн и неизвестный статус', () => {
    expect(formatLastSeen(null, true, now)).toBe('в сети');
    expect(formatLastSeen(null, null, now)).toBe('');
    expect(formatLastSeen(null, false, now)).toBe('был(а) давно');
  });

  it('форматирует минуты, сегодня, вчера и дату', () => {
    expect(formatLastSeen(new Date(2026, 8, 24, 17, 59, 30).toISOString(), false, now)).toBe(
      'был(а) только что',
    );
    expect(formatLastSeen(new Date(2026, 8, 24, 17, 55).toISOString(), false, now)).toBe(
      'был(а) 5 мин. назад',
    );
    expect(formatLastSeen(new Date(2026, 8, 24, 12, 10).toISOString(), false, now)).toBe(
      'был(а) сегодня в 12:10',
    );
    expect(formatLastSeen(new Date(2026, 8, 23, 21, 34).toISOString(), false, now)).toBe(
      'был(а) вчера в 21:34',
    );
    expect(formatLastSeen(new Date(2026, 8, 10, 9, 0).toISOString(), false, now)).toBe(
      'был(а) 10.09.2026',
    );
  });
});
