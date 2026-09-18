import { Fragment } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from '@/components/ui/item';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { ChevronRightIcon } from 'lucide-react';

export function ChatsPage() {
  const chats = [
    {
      avatarUrl: 'https://github.com/evilrabbit.png',
      initials: 'ER',
      fullname: 'Evil Rabbit',
      lastMessage: 'Message of me...',
    },
    {
      avatarUrl: 'https://github.com/evilrabbit.png',
      initials: 'ER',
      fullname: 'Evil Rabbit',
      lastMessage: 'Message of me...',
    },
    {
      avatarUrl: 'https://github.com/evilrabbit.png',
      initials: 'ER',
      fullname: 'Evil Rabbit',
      lastMessage: 'Message of me...',
    },
    {
      avatarUrl: 'https://github.com/evilrabbit.png',
      initials: 'ER',
      fullname: 'Evil Rabbit',
      lastMessage: 'Message of me...',
    },
    {
      avatarUrl: 'https://github.com/evilrabbit.png',
      initials: 'ER',
      fullname: 'Evil Rabbit',
      lastMessage: 'Message of me...',
    },
  ];
  return (
    <div className="mx-auto w-full p-4">
      <Card>
        <CardHeader>
          <CardTitle>Chats</CardTitle>
        </CardHeader>
        <CardContent>
          <ItemGroup className="flex w-full flex-col gap-0">
            {chats.map((chat, index) => (
              <Fragment key={index}>
                {index > 0 && <ItemSeparator className="w-full shrink-0" />}
                <Item
                  render={
                    <a href="#">
                      <ItemMedia>
                        <Avatar className="size-10">
                          <AvatarImage src={chat.avatarUrl} />
                          <AvatarFallback>{chat.initials}</AvatarFallback>
                        </Avatar>
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle>{chat.fullname}</ItemTitle>
                        <ItemDescription>{chat.lastMessage}</ItemDescription>
                      </ItemContent>
                      <ItemActions>
                        <ChevronRightIcon className="size-4" />
                      </ItemActions>
                    </a>
                  }
                />
              </Fragment>
            ))}
          </ItemGroup>
        </CardContent>
      </Card>
    </div>
  );
}
