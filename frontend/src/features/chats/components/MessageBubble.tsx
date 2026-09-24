import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import { Message, MessageAvatar, MessageContent } from '@/components/ui/message';
import { useEffect, useState } from 'react';
import type { Message as MessageType, PendingMessage, PublicUser } from '@features/chats/types';
import { mediaUrl } from '@/lib/mediaUrl';
import { getAccessToken } from '@/api/client';

interface MessageBubbleProps {
  message: MessageType | PendingMessage;
  isOwn: boolean;
  sender?: PublicUser;
}

function isPending(message: MessageType | PendingMessage): message is PendingMessage {
  return 'pending' in message && message.pending === true;
}

function fileNameOf(key: string): string {
  return key.split('/').pop() ?? key;
}

function Attachment({
  chatId,
  fileKey,
  name,
  mime,
}: {
  chatId: number;
  fileKey: string;
  name: string;
  mime: string;
}) {
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    const file = fileNameOf(fileKey);
    let objectUrl = '';
    const controller = new AbortController();
    const url = mediaUrl(`/chats/${chatId}/files/${file}`);
    if (!url) return;
    void fetch(url, {
      headers: { Authorization: `Bearer ${getAccessToken() ?? ''}` },
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.blob() : null))
      .then((blob) => {
        if (!blob) return;
        objectUrl = URL.createObjectURL(blob);
        setHref(objectUrl);
      })
      .catch(() => undefined);
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [chatId, fileKey]);

  if (mime.startsWith('image/') && href) {
    return <img src={href} alt={name} className="mb-1 max-h-64 rounded-xl object-cover" />;
  }

  return (
    <a href={href ?? undefined} download={name} className="mb-1 block underline">
      {name}
    </a>
  );
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
            {sender?.avatarUrl && <AvatarImage src={mediaUrl(sender.avatarUrl)} />}
            <AvatarFallback className="text-xs">{initialsOf(sender)}</AvatarFallback>
          </Avatar>
        </MessageAvatar>
      )}
      <MessageContent>
        <Bubble variant={isOwn ? 'default' : 'muted'} align={isOwn ? 'end' : 'start'}>
          <BubbleContent>
            {message.attachmentKey && (
              <Attachment
                chatId={message.chatId}
                fileKey={message.attachmentKey}
                name={message.attachmentName ?? 'Файл'}
                mime={message.attachmentMime ?? ''}
              />
            )}
            {message.body}
          </BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  );
}
