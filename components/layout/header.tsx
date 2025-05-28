"use client"

import * as React from "react"
import { Bell, Search, Settings, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useCompany } from '@/components/context/company-context'

export function Header({ showNotifications, setShowNotifications, alerts }: {
  showNotifications: boolean,
  setShowNotifications: (v: boolean) => void,
  alerts: { id: number, type: string, message: string, action: string }[]
}) {
  const { company, setCompany } = useCompany();

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center gap-4 px-6">
        <div className="flex-1 flex items-center gap-4">
          <label htmlFor="company" className="font-semibold mr-2">Company:</label>
          <input
            id="company"
            className="rounded border px-3 py-2 text-base w-48"
            placeholder="Enter company name"
            value={company}
            onChange={e => setCompany(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4">
          <button
            className="relative p-2 rounded-full bg-white/80 dark:bg-zinc-900/80 shadow hover:bg-accent/10 focus:ring-2 focus:ring-accent transition"
            aria-label="Show notifications"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Bell clicked');
              console.log('Current showNotifications:', showNotifications);
              console.log('Current alerts:', alerts);
              setShowNotifications(!showNotifications);
              console.log('New showNotifications value:', !showNotifications);
            }}
          >
            <Bell className="h-5 w-5 text-primary" />
            {alerts.length > 0 && (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
            )}
          </button>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/avatars/01.png" alt="Executive" />
                  <AvatarFallback>EX</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">Executive User</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    executive@company.com
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
} 