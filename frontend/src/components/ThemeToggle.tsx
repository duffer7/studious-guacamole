import { Moon, Sun } from 'lucide-react';
import { Button } from '@ui/button';
import { useTheme } from '@/hooks/useTheme';

export function ThemeToggle() {
  const { toggle } = useTheme();
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Переключить тему">
      <Sun className="size-4 dark:hidden" />
      <Moon className="hidden size-4 dark:block" />
    </Button>
  );
}
