"use client"
import { useState } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { BoardroomMemoryProvider } from "@/components/context/boardroom-memory"
import { CompanyProvider } from '@/components/context/company-context'

export function ClientRoot({ children }: { children: React.ReactNode }) {
  return (
    <CompanyProvider>
      <BoardroomMemoryProvider>
        <MainLayout>
          {children}
        </MainLayout>
      </BoardroomMemoryProvider>
    </CompanyProvider>
  )
} 