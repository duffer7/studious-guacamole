import { LoginForm } from '@/features/auth/components/LoginForm';
import { RegisterForm } from '@/features/auth/components/RegisterForm';
import { Button } from '@components/ui/button';
import { useState } from 'react';

export function AuthPage() {
  const [form, setForm] = useState(true);

  return (
    <div className="flex">
      <div className="h-16 flex-1"></div>
      <div className="h-16 w-100">
        {form ? (
          <LoginForm onSwitchToRegister={() => setForm(false)} />
        ) : (
          <RegisterForm onSwitchToLogin={() => setForm(true)} />
        )}
      </div>
      <div className="h-16 flex-1"></div>
    </div>
  );
}
