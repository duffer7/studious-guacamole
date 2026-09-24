import { LoginForm } from '@features/auth/components/LoginForm';

export function LoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[radial-gradient(ellipse_at_top,var(--accent),transparent_55%)] px-4 py-10">
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </div>
  );
}
