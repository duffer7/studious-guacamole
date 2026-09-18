import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { Link } from '@tanstack/react-router';

export function Navbar() {
  return (
    <div className="flex absolute inset-x-0 bottom-4 items-center justify-center">
      <NavigationMenu>
        <div className="w-10 flex-1"></div>
        <NavigationMenuList className="w-max flex-1 rounded-xl bg-background shadow-xl ring-1 ring-foreground/10">
          <NavigationMenuItem>
            <NavigationMenuLink
              className={navigationMenuTriggerStyle()}
              render={<Link to="/chats">Chats</Link>}
            />
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink
              className={navigationMenuTriggerStyle()}
              render={<Link to="/settings">Settings</Link>}
            />
          </NavigationMenuItem>
        </NavigationMenuList>
        <div className="w-10 flex-1"></div>
      </NavigationMenu>
    </div>
  );
}
