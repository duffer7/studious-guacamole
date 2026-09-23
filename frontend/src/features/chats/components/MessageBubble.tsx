import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import { Message, MessageAvatar, MessageContent } from '@/components/ui/message';
import type { Message as MessageType, PendingMessage, PublicUser } from '@features/chats/types';

interface MessageBubbleProps {
  message: MessageType | PendingMessage;
  isOwn: boolean;
  sender?: PublicUser;
}

function isPending(message: MessageType | PendingMessage): message is PendingMessage {
  return 'pending' in message && message.pending === true;
}

function initialsOf(user: PublicUser | undefined): string {
  const source = user?.displayName || user?.username || '?';
  return source.slice(0, 2).toUpperCase();
}
export function MessageBubble({ message, isOwn, sender }: MessageBubbleProps) {
  const pending = isPending(message);

  return (
    <Message align={isOwn ? 'end' : 'start'} className={pending ? 'opacity-60' : undefined}>
      {!isOwn && (
        <MessageAvatar>
          <Avatar className="size-8">
            {sender?.avatarUrl && <AvatarImage src={sender.avatarUrl} />}
            <AvatarFallback className="text-xs">{initialsOf(sender)}</AvatarFallback>
          </Avatar>
        </MessageAvatar>
      )}
      <MessageContent>
        <Bubble variant={isOwn ? 'default' : 'muted'} align={isOwn ? 'end' : 'start'}>
          <BubbleContent>{message.body}</BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  );
}
