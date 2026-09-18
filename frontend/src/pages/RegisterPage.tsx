import { RegisterForm } from '@features/auth/components/RegisterForm';

export function RegisterPage() {
  return (
    <div className="flex">
      <div className="h-16 flex-1"></div>
      <div className="h-16 w-100">
        <RegisterForm />
      </div>
      <div className="h-16 flex-1"></div>
    </div>
  );
}
