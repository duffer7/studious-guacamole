import { LoginForm } from '@/features/auth/components/LoginForm';

export function LoginPage() {
  return (
    <div className="flex">
      <div className="h-16 flex-1"></div>
      <div className="h-16 w-100">
        <LoginForm />
      </div>
      <div className="h-16 flex-1"></div>
    </div>
  );
}
