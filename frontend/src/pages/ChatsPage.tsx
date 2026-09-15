import { Link } from '@tanstack/react-router';

/** Заглушка списка чатов — здесь будет список диалогов из Query. */
export function ChatsPage() {
  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold">Чаты</h1>
      <p className="mt-2 text-sm text-muted-foreground">Список диалогов появится здесь.</p>
      <Link to="/settings" className="mt-4 inline-block text-sm text-primary hover:underline">
        Настройки
      </Link>
    </div>
  );
}
