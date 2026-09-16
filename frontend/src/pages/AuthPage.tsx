import { LoginForm } from '@/features/auth/components/LoginForm';
import { RegisterForm } from '@/features/auth/components/RegisterForm';
import { useState } from 'react';

export function AuthPage() {
  const [form, setForm] = useState('login');

  return (
    <div className="flex">
      <div className="h-16 flex-1"></div>
      <div className="h-16 w-100">
        {form === 'login' ? (
          <LoginForm onSwitchToRegister={() => setForm('login')} />
        ) : (
          <RegisterForm onSwitchToLogin={() => setForm('register')} />
        )}
      </div>
      <div className="h-16 flex-1"></div>
    </div>
  );
}
