import { createFileRoute } from '@tanstack/react-router';
import { RegisterPage } from '@/pages/RegisterPage';

export const Route = createFileRoute('/_auth/auth/register')({
  component: RegisterPage,
});
