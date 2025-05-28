"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  BarChart3,
  Briefcase,
  Calendar,
  FileText,
  Home,
  MessageSquare,
  Settings,
  Users,
} from "lucide-react"

// Only show Dashboard for focused executive workflow. Board Pack is accessed from the main screen.
const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  // Board Pack link removed from sidebar for demo clarity. Restore if sidebar navigation is needed.
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col border-r bg-background" style={{ borderLeft: '4px solid hsl(var(--accent))', background: 'hsl(var(--primary) / 0.03)' }}>
      <div className="flex h-14 items-center border-b px-4">
        <div className="flex items-center gap-2">
          <span className="inline-block h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            {/* Executive placeholder logo SVG */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" fill="hsl(var(--accent))" />
              <text x="12" y="16" textAnchor="middle" fontSize="12" fill="white" fontWeight="bold">E.I.</text>
            </svg>
          </span>
          <span className="text-xl font-bold tracking-tight">E.I. Copilot</span>
        </div>
      </div>
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid items-start px-2 text-sm font-medium">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-foreground",
                  isActive && "bg-muted text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
} 