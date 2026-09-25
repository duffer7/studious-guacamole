import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { mediaUrl } from '@/lib/mediaUrl';
import { usePresence } from '@features/chats/presence/usePresence';

interface UserAvatarWithPresenceProps {
  userId: number;
  avatarUrl?: string | null;
  fallback: string;
  className?: string;
  online?: boolean | null;
  lastSeenAt?: string | null;
}

export function UserAvatarWithPresence({
  userId,
  avatarUrl,
  fallback,
  className,
  online,
  lastSeenAt,
}: UserAvatarWithPresenceProps) {
  const presence = usePresence(userId, { online, lastSeenAt });

  return (
    <Avatar className={className}>
      {avatarUrl && <AvatarImage src={mediaUrl(avatarUrl)} />}
      <AvatarFallback>{fallback}</AvatarFallback>
      {presence.online === true && <AvatarBadge className="bg-emerald-500" />}
    </Avatar>
  );
}
