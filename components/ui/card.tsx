import * as React from "react"

export function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-6 mb-4">{children}</div>
}

export function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-2">{children}</div>
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-bold mb-1">{children}</h2>
}

export function CardDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-zinc-500 dark:text-zinc-400 mb-2">{children}</p>
}

export function CardContent({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
} 