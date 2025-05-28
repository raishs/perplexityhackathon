"use client"

import * as React from "react"
import { ThemeProvider } from "next-themes"
import { Header } from "./header"
import { Sidebar } from "./sidebar"
import { Toaster } from "@/components/ui/toaster"
import { toast } from "sonner"
import { askPerplexity } from "@/lib/perplexity"
import { useBoardroomMemory } from "@/components/context/boardroom-memory"
import { Bell } from "lucide-react"
import { FormattedInsight } from '../FormattedInsight'
import { useCompany } from '@/components/context/company-context'

interface MainLayoutProps {
  children: React.ReactNode
  company: string
  setCompany: (company: string) => void
}

interface MemoryItem {
  id: number;
  title: string;
  description: string;
  timestamp: string;
  type: 'board-pack' | 'brief' | 'alert';
}

const demoAlerts = [
  {
    id: 1,
    type: 'warning',
    message: 'Market volatility detected in your sector',
    action: 'View Risk Alert',
  },
  {
    id: 2,
    type: 'info',
    message: 'New compliance requirements announced for your industry',
    action: 'View Regulatory Update',
  },
  {
    id: 3,
    type: 'action',
    message: 'Competitive landscape has shifted in your market',
    action: 'View Competitive Analysis',
  },
]

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { company, setCompany } = useCompany();
  const [showNotifications, setShowNotifications] = React.useState(false)
  const [alerts, setAlerts] = React.useState(demoAlerts)
  const [isGenerating, setIsGenerating] = React.useState(false)
  const { memory, setMemory } = useBoardroomMemory()
  const notificationRef = React.useRef<HTMLDivElement>(null)
  const [recentInsight, setRecentInsight] = React.useState<null | { title: string; description: string; type: 'board-pack' | 'brief' | 'alert'; timestamp?: string }>(null)

  // Debug log when showNotifications changes
  React.useEffect(() => {
    console.log('showNotifications changed to:', showNotifications);
  }, [showNotifications]);

  // Handle click outside to close notifications
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        console.log('Click outside detected, closing notifications');
        setShowNotifications(false);
      }
    }

    if (showNotifications) {
      console.log('Adding click outside listener');
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      console.log('Removing click outside listener');
      document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showNotifications]);

  // Seed demo alerts if empty (for demo/dev)
  React.useEffect(() => {
    if (alerts.length === 0) {
      console.log('Seeding demo alerts');
      setAlerts(demoAlerts);
    }
  }, []);

  // Hide recentInsight as soon as the corresponding insight is in memory (not loading)
  React.useEffect(() => {
    if (recentInsight &&
      (recentInsight.title.toLowerCase().includes('competitive intelligence') || recentInsight.title.toLowerCase().includes('competitive analysis'))
    ) {
      const found = memory.find(item =>
        item.title.replace(/ \(Perplexity\)| \(Loading\.\.\.\)/, '') === recentInsight.title.replace(/ \(Perplexity\)| \(Loading\.\.\.\)/, '') &&
        item.description !== 'Generating Perplexity-powered insight... Please wait.'
      );
      if (found) {
        setRecentInsight(null);
      }
    }
  }, [memory, recentInsight]);

  async function handleAlertAction(alert: { id: number; type: string; message: string; action: string; }) {
    let prompt = ''
    let type: 'brief' | 'alert' = 'brief'
    let title = ''
    if (alert.id === 1) {
      prompt = `What are the top market risks for ${company} this week? Provide a board-ready summary with cited sources.\n\nThen, under the heading \"Action Items:\", list 3-5 clear, actionable next steps as markdown bullet points.\n\nAt the end, include a \"References:\" section with clickable URLs for each source.`
      type = 'alert'
      title = 'Market Risk Alert'
    } else if (alert.id === 2) {
      prompt = `Summarize the latest regulatory changes affecting ${company} and recommend board actions. Provide cited sources.\n\nThen, under the heading \"Action Items:\", list 3-5 clear, actionable next steps as markdown bullet points.\n\nAt the end, include a \"References:\" section with clickable URLs for each source.`
      type = 'brief'
      title = 'Regulatory Update'
    } else if (alert.id === 3) {
      prompt = `Perform a deep, board-level competitive analysis for ${company} as of ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}.

Structure your response in markdown with the following sections:

### Executive Summary
2–3 sentences on the current competitive landscape and key risks/opportunities.

### Recent High-Impact Competitor Moves
- Bullet list: [Competitor], [Move], [Date], [Strategic Implication for ${company}], [Source]

### Market Shifts, Threats & Opportunities
- Market trends, regulatory changes, new threats, and opportunities (bullets or short paragraphs)

### Board-Ready Recommendations
- 3–5 specific, actionable next steps for ${company} to improve its position

### References
- Numbered, clickable links for all sources

Do NOT include a 'Top Competitors' table or section. Focus on recent moves, implications, and board-level recommendations. All claims must be cited with sources.`
      type = 'brief'
      title = 'Competitive Intelligence Brief'
    }
    // Add loading card
    const loadingId = Date.now()
    setMemory(mem => [
      ...mem,
      {
        id: loadingId,
        title: `${title} (Loading...)`,
        description: 'Generating Perplexity-powered insight... Please wait.',
        timestamp: 'just now',
        type
      }
    ])
    setAlerts(alerts.filter(a => a.id !== alert.id))
    setShowNotifications(false)
    setIsGenerating(true)
    try {
      const data = await askPerplexity(prompt)
      setMemory(mem => mem.map(item =>
        item.id === loadingId
          ? {
              ...item,
              title: `${title} (Perplexity)` ,
              description: data.choices?.[0]?.message?.content || '[No answer returned]',
              references: data.citations || [],
              timestamp: 'just now',
              type
            }
          : item
      ))
      // Show the result immediately in a panel if it's a competitive analysis
      if (title.toLowerCase().includes('competitive intelligence') || title.toLowerCase().includes('competitive analysis')) {
        setRecentInsight({
          title: `${title} (Perplexity)` ,
          description: data.choices?.[0]?.message?.content || '[No answer returned]',
          type,
          timestamp: 'just now',
        });
        setTimeout(() => setRecentInsight(null), 8000); // Hide after 8 seconds
      }
    } catch (e) {
      setMemory(mem => mem.map(item =>
        item.id === loadingId
          ? {
              ...item,
              title: `${title} (Error)` ,
              description: 'Failed to generate Perplexity insight.',
              timestamp: 'just now',
              type
            }
          : item
      ))
    }
    setIsGenerating(false)
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <div className="relative flex min-h-screen flex-col">
        <Header
          showNotifications={showNotifications}
          setShowNotifications={setShowNotifications}
          alerts={alerts}
        />
        {/* Notification Dropdown */}
        {showNotifications && (
          <div ref={notificationRef} className="fixed right-8 top-20 w-96 z-[100] bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-4 animate-fade-in flex flex-col gap-3">
            <div className="font-bold text-lg mb-2 flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notifications
            </div>
            {alerts.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">No notifications yet. You're all caught up!</div>
            ) : (
              alerts.slice(0, 3).map(alert => (
                <div key={alert.id} className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3 gap-4">
                  <div className="flex flex-col flex-1">
                    <span className="font-semibold text-base mb-2">{alert.message}</span>
                    <div className="flex gap-2 items-center">
                      <button
                        className="px-4 py-1 rounded-lg bg-primary text-primary-foreground font-semibold shadow hover:bg-primary/90 focus:ring-2 focus:ring-accent transition text-xs"
                        style={{ minWidth: 120 }}
                        onClick={() => handleAlertAction(alert)}
                        disabled={isGenerating}
                      >
                        {isGenerating ? 'Generating…' : alert.action}
                      </button>
                    </div>
                  </div>
                  <button
                    className="ml-2 px-2 py-1 rounded bg-transparent text-muted-foreground hover:bg-muted/80 focus:ring-2 focus:ring-accent transition text-xs self-start"
                    style={{ minWidth: 60 }}
                    onClick={() => setAlerts(alerts.filter(a => a.id !== alert.id))}
                    aria-label="Dismiss alert"
                    disabled={isGenerating}
                  >
                    Dismiss
                  </button>
                </div>
              ))
            )}
          </div>
        )}
        <div className="flex flex-1 min-h-0">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="w-full">
              {/* Show recent competitive analysis insight panel if present */}
              {recentInsight && (
                <div className="mb-8 animate-fade-in border-2 border-accent rounded-2xl bg-white/90 dark:bg-zinc-900/90 shadow-xl p-6">
                  <FormattedInsight
                    title={recentInsight.title}
                    description={recentInsight.description}
                    type={recentInsight.type}
                    timestamp={recentInsight.timestamp}
                  />
                </div>
              )}
              {children}
            </div>
          </main>
        </div>
        <Toaster />
      </div>
    </ThemeProvider>
  )
} 