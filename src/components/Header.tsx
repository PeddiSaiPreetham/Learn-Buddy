
"use client";

import Link from 'next/link';
import { ListChecks, LogOut, UserCircle, Loader2, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Header() {
  const { user, loading, logout } = useAuth();

  const getInitials = (email?: string | null) => {
    if (!email) return 'U';
    const parts = email.split('@')[0].split(/[._-]/);
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };


  return (
    <header className="py-8 text-center relative">
      <div className="inline-flex items-center gap-3">
        <ListChecks className="h-10 w-10 text-primary" />
        <h1 className="text-4xl font-headline font-bold text-foreground sm:text-5xl">
          Learn Buddy
        </h1>
      </div>
      <p className="mt-2 text-lg text-muted-foreground">
        Organize your work with smart suggestions and effort estimation.
      </p>
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        {loading ? (
          <Button variant="ghost" size="icon" disabled>
            <Loader2 className="h-6 w-6 animate-spin" />
          </Button>
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.photoURL || undefined} alt={user.displayName || user.email || "User"} />
                  <AvatarFallback>{getInitials(user.email)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user.displayName || user.email?.split('@')[0]}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/login">
                <LogIn className="mr-2 h-4 w-4" /> Login
              </Link>
            </Button>
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/signup">
                <UserCircle className="mr-2 h-4 w-4" /> Sign Up
              </Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
