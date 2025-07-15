'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  UserCircle,
  Menu,
  ChevronUp,
  User2,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  useSidebar
} from "@/components/ui/sidebar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { User, MentorResponse } from "@/types/api";
import { Badge } from "@/components/ui/badge";

const AdminNav = React.memo(() => {
  const pathname = usePathname();
  const { state } = useSidebar();

  return (
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Navigation</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton asChild isActive={pathname === '/dashboard'}>
                      <Link href="/dashboard" className="relative group">
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Overview</span>
                        {state === "collapsed" && (
                          <TooltipContent side="right">Overview</TooltipContent>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </TooltipTrigger>
                </Tooltip>
              </TooltipProvider>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton asChild isActive={pathname === '/dashboard/mentors'}>
                      <Link href="/dashboard/mentors" className="relative group">
                        <Users className="h-4 w-4" />
                        <span>Mentors</span>
                        {state === "collapsed" && (
                          <TooltipContent side="right">Mentors</TooltipContent>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </TooltipTrigger>
                </Tooltip>
              </TooltipProvider>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
});
AdminNav.displayName = 'AdminNav';

const MentorNav = React.memo(() => {
  const pathname = usePathname();
  const { state } = useSidebar();

  return (
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Navigation</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton asChild isActive={pathname === '/dashboard/profile'}>
                      <Link href="/dashboard/profile" className="relative group">
                        <UserCircle className="h-4 w-4" />
                        <span>My Profile</span>
                        {state === "collapsed" && (
                          <TooltipContent side="right">My Profile</TooltipContent>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </TooltipTrigger>
                </Tooltip>
              </TooltipProvider>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
});
MentorNav.displayName = 'MentorNav';

function DashboardContent({ user, children }: { user: User | MentorResponse, children: React.ReactNode }) {
  const { state } = useSidebar();
  const { logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="flex min-h-screen max-h-screen overflow-hidden w-full">
      <Sidebar collapsible="icon" className="min-h-screen border-r">
        <SidebarHeader>
          <div className="py-2">
            <Link href="/">
              {state === "expanded" ? (
                <div className='px-3 flex items-center gap-2'>
                  <h3 className="font-bold text-xl">BAMN</h3>
                  <Badge variant="default" className="font-normal">
                    {user.role === 'admin' ? 'Admin Panel' : 'Dashboard'}
                  </Badge>
                </div>
              ) : (
                <div className="flex w-8 h-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <span className="font-black text-base">B</span>
                </div>
              )}
            </Link>
          </div>
        </SidebarHeader>
        {user.role === 'admin' ? <AdminNav /> : <MentorNav />}
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton>
                    <User2 className="h-4 w-4" />
                    <span>{user.email}</span>
                    <ChevronUp className="ml-auto h-4 w-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" className="w-[--radix-popper-anchor-width]">
                  <DropdownMenuItem onClick={handleLogout}>
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <main className="flex-1 w-full">
        <div className="flex items-center px-4 h-14">
          <SidebarTrigger className="h-9 w-9">
            <Menu size={20} />
          </SidebarTrigger>
        </div>
        <div className="px-6 pb-6 w-full h-[calc(100vh-3.5rem)] overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = getUser();

  if (!user) return null;

  return (
    <SidebarProvider>
      <DashboardContent user={user}>
        {children}
      </DashboardContent>
    </SidebarProvider>
  );
} 