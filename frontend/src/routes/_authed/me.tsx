import { MePage } from '@/pages/MePage';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authed/me')({
  component: MePage,
});
