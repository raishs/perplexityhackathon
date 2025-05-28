"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ResearchInterface } from "@/components/research-interface"
import { CalendarView } from "@/components/calendar-view"
import { KnowledgeBase } from "@/components/knowledge-base"

export function Dashboard() {
  const [activeTab, setActiveTab] = useState("research")

  return (
    <div className="container mx-auto p-4">
      <Tabs defaultValue="research" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="research">Research</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
        </TabsList>
        <TabsContent value="research">
          <Card>
            <CardHeader>
              <CardTitle>Executive Research</CardTitle>
              <CardDescription>
                Get comprehensive insights with strategic context
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResearchInterface />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Meetings</CardTitle>
              <CardDescription>
                Research context for your scheduled meetings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CalendarView />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="knowledge">
          <Card>
            <CardHeader>
              <CardTitle>Knowledge Base</CardTitle>
              <CardDescription>
                Your curated collection of strategic insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <KnowledgeBase />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 