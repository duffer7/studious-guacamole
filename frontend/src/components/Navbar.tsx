import { Link } from '@tanstack/react-router';
import { MessageSquareIcon, SettingsIcon, UserRoundIcon } from 'lucide-react';
import { ThemeToggle } from '@components/ThemeToggle';

const links = [
  { to: '/chats', label: 'Чаты', icon: MessageSquareIcon },
  { to: '/me', label: 'Профиль', icon: UserRoundIcon },
  { to: '/settings', label: 'Настройки', icon: SettingsIcon },
] as const;

export function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
        <Link to="/chats" className="text-sm font-semibold tracking-tight">
          Guacamole
        </Link>
        <nav className="flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              activeProps={{ className: 'bg-accent text-accent-foreground' }}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <link.icon className="size-4" />
              <span className="hidden sm:inline">{link.label}</span>
            </Link>
          ))}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
