"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { AiAdoptionChart } from "../components/analytics/ai-adoption-chart"
import { Sparkles, FileText, ArrowRight, AlertTriangle, CheckCircle, ChevronRight, Bell, Loader2 } from "lucide-react"
import { askPerplexity } from "@/lib/perplexity"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { Dialog } from '@headlessui/react'
import { useBoardroomMemory } from "@/components/context/boardroom-memory"
import { FormattedInsight } from '../components/FormattedInsight'
import CompetitiveThreatAlertCard from '../components/CompetitiveThreatAlertCard'
import type { MemoryItem as BoardroomMemoryItem } from '@/components/context/boardroom-memory'
import { useCompany } from '@/components/context/company-context'

const execName = "Alex" // Placeholder

const examplePrompts = [
  "What are the key risks in our current market strategy?",
  "How might AI impact our industry in the next 12 months?",
  "What are our competitors' recent moves?",
]

const initialMemory = [
  {
    id: 1,
    title: "Board Pack - Q2 2024",
    description: "Generated and shared with board. Included market, risk, and opportunity analysis.",
    timestamp: "2 days ago",
    type: "board-pack"
  },
  {
    id: 2,
    title: "AI Strategy Brief",
    description: "Perplexity-powered research on AI adoption trends.",
    timestamp: "1 week ago",
    type: "brief"
  },
  {
    id: 3,
    title: "Risk Alert: New Competitor",
    description: "Alerted to new market entrant. Action: scheduled strategy session.",
    timestamp: "1 week ago",
    type: "alert"
  }
]

const heroInsight = {
  title: "Top Opportunity: AI adoption up 12% this quarter",
  description: "AI-driven automation is accelerating in your sector. Early adopters are seeing 15% cost savings. Consider piloting new AI initiatives.",
  source: "Perplexity Deep Research",
  cta: "View Details"
}

const proactiveAlert = {
  message: "Competitor X just launched a new product in your market.",
  cta: "View Analysis"
}

const kpis = [
  { label: "Market Share", value: "24.3%", trend: "+2.1%" },
  { label: "Revenue Growth", value: "$12.4M", trend: "+15%" },
  { label: "Customer Satisfaction", value: "92%", trend: "+4%" },
]

// Demo proactive alerts
const demoAlerts = [
  {
    id: 1,
    type: 'action',
    message: "Competitive Threat: A leading competitor has launched new enterprise AI features that could impact Perplexity's core business.",
    action: 'View Competitive Threat',
  },
]

// Utility: Convert plain URLs to markdown links
function linkify(text: string): string {
  return text.replace(/(https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+)/g, (url) => {
    if (/\]\([^)]+\)$/.test(url)) return url;
    return `[${url}](${url})`;
  });
}

// Robust parser: extract Action Items and References regardless of heading, whitespace, or markdown quirks
function parseInsightSections(markdown: string) {
  if (!markdown) return { summary: '', actionItems: [], references: [] };
  // Normalize line endings and spacing
  const norm = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Find the first Action Items or References section
  let summary = norm;
  const actionIdx = norm.search(/(?:^|\n)\s*(?:##+\s*)?Action Items:?\s*\n/i);
  const refIdx = norm.search(/(?:^|\n)\s*(?:##+\s*)?References?:?\s*\n/i);
  let cutIdx = -1;
  if (actionIdx !== -1 && refIdx !== -1) {
    cutIdx = Math.min(actionIdx, refIdx);
  } else if (actionIdx !== -1) {
    cutIdx = actionIdx;
  } else if (refIdx !== -1) {
    cutIdx = refIdx;
  }
  if (cutIdx !== -1) {
    summary = norm.slice(0, cutIdx).trim();
  }

  // Special case: If '### Executive Summary' exists, extract only its content
  const execMatch = norm.match(/### Executive Summary\n([\s\S]*?)(?=\n### |\n## |$)/);
  if (execMatch && execMatch[1]) {
    summary = execMatch[1].trim();
  }

  // Try to find Action Items (heading or just 'Action Items:')
  const actionItemsMatch = norm.match(/(?:^|\n)\s*(?:##+\s*)?Action Items:?\s*\n([\s\S]*?)(?=\n\s*(?:##+|References?:|$))/i);
  // Try to find References (heading or just 'References:')
  const referencesMatch = norm.match(/(?:^|\n)\s*(?:##+\s*)?References?:?\s*\n([\s\S]*)/i);

  let actionItems: string[] = [];
  let references: string[] = [];

  if (actionItemsMatch) {
    actionItems = actionItemsMatch[1]
      .split(/\n+/)
      .map(line => line.trim())
      .filter(line => line && !/^Action Items:?$/i.test(line) && !/^[-_]{3,}$/i.test(line))
      .map(line => line.replace(/^[-*+]\s+/, '').replace(/^\d+\.\s+/, ''));
  }

  if (referencesMatch) {
    references = referencesMatch[1]
      .split(/\n+/)
      .map(line => line.trim())
      .filter(line => line && !/^References:?$/i.test(line))
      .map(line => line.replace(/^[\[\(]?(\d+)[\]\)]?\s*/, ''));
  }

  // Replace [n] with anchor links in summary
  summary = summary.replace(/\[(\d+)\]/g, (match, n) => {
    return `<sup><a href='#ref-${n}' class='text-primary underline' aria-label='Reference ${n}'>[${n}]</a></sup>`;
  });

  // Debug log
  console.log('RAW PERPLEXITY:', markdown);
  console.log('parseInsightSections output:', { summary, actionItems, references });

  return { summary, actionItems, references };
}

// Define type for executive memory items
type MemoryItem = BoardroomMemoryItem;

// Helper: Render action items as a real bulleted list with icons
function ActionItemsList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-6 space-y-2">
      {items.map((ai, idx) => (
        <li key={idx} className="flex items-start gap-2">
          <span className="text-green-600 mt-0.5">✅</span>
          <span>{ai}</span>
        </li>
      ))}
    </ul>
  );
}

// Helper: Split summary into paragraphs for readability
function renderSummary(summary: string) {
  // If markdown, let ReactMarkdown handle it
  if (summary.includes('#') || summary.includes('- ') || summary.includes('* ')) {
    return <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{summary}</ReactMarkdown>;
  }
  // Otherwise, split into paragraphs at double newlines or after periods followed by a newline
  const paras = summary
    .replace(/([.!?])\n(?=[A-Z])/g, '$1\n\n') // Add extra newline after sentence end
    .split(/\n{2,}/)
    .map(para => para.trim())
    .filter(Boolean);
  return paras.map((para, idx) => (
    <p key={idx} className="mb-4 text-base leading-relaxed">{para}</p>
  ));
}

// Helper: Truncate URLs for references
function truncateUrl(url: string) {
  try {
    const u = new URL(url);
    return u.hostname + (u.pathname.length > 20 ? u.pathname.slice(0, 20) + '…' : u.pathname);
  } catch {
    return url.length > 40 ? url.slice(0, 37) + '…' : url;
  }
}

// Helper: Get short plain-text summary (first 2 lines or 160 chars, strip markdown/HTML)
function getShortPlainSummary(summary: string) {
  // Remove markdown and HTML tags
  const plain = summary.replace(/[#*_`>\[\]\(\)\-]/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const lines = plain.split('. ');
  if (lines.length > 1) return lines.slice(0, 2).join('. ') + (lines.length > 2 ? '…' : '');
  return plain.length > 160 ? plain.slice(0, 157) + '…' : plain;
}

// Helper: Render a styled markdown table
function StyledMarkdownTable({ markdown }: { markdown: string }) {
  return (
    <div className="overflow-x-auto my-4">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          table: ({ node, ...props }) => <table className="min-w-full border text-sm my-2" {...props} />,
          th: ({ node, ...props }) => <th className="border px-3 py-2 bg-muted font-bold" {...props} />,
          td: ({ node, ...props }) => <td className="border px-3 py-2" {...props} />,
        }}
      >{markdown}</ReactMarkdown>
    </div>
  );
}

export default function Home() {
  const { memory, setMemory, pinnedId, setPinnedId } = useBoardroomMemory()
  const [question, setQuestion] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showAlert, setShowAlert] = useState(false)
  const [answer, setAnswer] = useState<string | null>(null)
  const [citations, setCitations] = useState<string[] | null>(null)
  const [expandedMemoryId, setExpandedMemoryId] = useState<number | null>(null)
  const [alerts, setAlerts] = useState(demoAlerts)
  const [showNotifications, setShowNotifications] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalContent, setModalContent] = useState<MemoryItem | null>(null)
  const { company } = useCompany()

  // Find the pinned insight, or default to the latest
  const executiveSummary = pinnedId
    ? memory.find(item => item.id === pinnedId)
    : memory.length > 0
      ? memory[memory.length - 1]
      : null

  // Timeline: all except the pinned one
  const timeline = memory.slice().reverse().filter(item => !executiveSummary || item.id !== executiveSummary.id);
  // Remove any additional duplicates by id (in case of accidental duplicates)
  const seenIds = new Set();
  const dedupedTimeline = timeline.filter(item => {
    if (!item || typeof item.id === 'undefined') return false;
    if (executiveSummary && item.id === executiveSummary.id) return false;
    if (seenIds.has(item.id)) return false;
    seenIds.add(item.id);
    return true;
  });
  // Debug logs for deduplication
  console.log('ExecutiveSummary ID:', executiveSummary?.id);
  console.log('dedupedTimeline IDs:', dedupedTimeline.map(i => i.id));

  // Always show timeline if there are any memory items except the pinned one
  const showTimeline = timeline.length > 0 || (memory.length > 1)

  // Add debug log for memory and timeline
  console.log('Memory:', memory);
  console.log('ExecutiveSummary:', executiveSummary);
  console.log('Timeline:', timeline);

  // Add debug log for timeline array and markdown before rendering
  console.log('Rendering ExecutiveSummary.description markdown:', executiveSummary?.description)
  console.log('Rendering timeline array:', timeline)
  timeline.forEach(item => {
    console.log('Rendering Timeline item markdown:', item.description)
  })

  // In Home component, always use parsed fields for rendering
  const getParsedFields = (item: MemoryItem) => {
    return parseInsightSections(item.description);
  };

  // Executive Summary rendering:
  const execFields = executiveSummary ? getParsedFields(executiveSummary) : { summary: '', actionItems: [], references: [] };
  console.log('Rendering ExecutiveSummary fields:', execFields);

  const handleAskQuestion = async () => {
    if (!question.trim()) return
    setIsGenerating(true)
    setAnswer(null)
    setCitations(null)
    try {
      const prompt = `For the company ${company}, ${question}`
      const data = await askPerplexity(prompt)
      setAnswer(data.choices?.[0]?.message?.content || "[No answer returned]")
      setCitations(data.citations || ["Perplexity"])
      toast.success("Board-ready answer generated", {
        description: "Perplexity delivered a cited, executive summary.",
        action: {
          label: "View",
          onClick: () => {}
        }
      })
    } catch (e) {
      toast.error("Perplexity API error", { description: String(e) })
    }
    setIsGenerating(false)
    setQuestion("")
  }

  const handleGenerateBoardPack = async () => {
    setIsGenerating(true)
    setShowConfetti(true)
    setAnswer(null)
    setCitations(null)
    try {
      const prompt = `Generate a board pack for ${company}`
      const data = await askPerplexity(prompt)
      setAnswer(data.choices?.[0]?.message?.content || "[No answer returned]")
      setCitations(data.citations || ["Perplexity"])
      toast.success("Board Pack Generated!", {
        description: "Your board pack is ready with the latest insights.",
        action: {
          label: "View",
          onClick: () => {}
        }
      })
    } catch (e) {
      toast.error("Perplexity API error", { description: String(e) })
    }
    setTimeout(() => setShowConfetti(false), 2000)
    setIsGenerating(false)
  }

  // Demo: handle alert actions to generate real Perplexity-powered content
  async function handleAlertAction(alert: typeof demoAlerts[number]) {
    let prompt = ''
    let type: 'brief' | 'alert' = 'brief'
    let title = ''
    if (alert.id === 1) {
      prompt = `What are the top market risks for ${company} this week? Provide a board-ready summary with cited sources. Then, under the heading "Action Items:", list 3-5 clear, actionable next steps as markdown bullet points.`;
      type = 'alert'
      title = 'Market Risk Alert'
    } else if (alert.id === 2) {
      prompt = `Summarize the latest regulatory changes affecting ${company} and recommend board actions. Provide cited sources. Then, under the heading "Action Items:", list 3-5 clear, actionable next steps as markdown bullet points.`;
      type = 'brief'
      title = 'Regulatory Update'
    } else if (alert.id === 3) {
      prompt = `What are the strategic implications of Competitor X's latest product launch for ${company}? Provide a board-ready brief with cited sources. Then, under the heading "Action Items:", list 3-5 clear, actionable next steps as markdown bullet points.`;
      type = 'brief'
      title = 'Competitor X Product Launch'
    }
    
    const loadingId = Date.now()
    setMemory((mem: MemoryItem[]) => [
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
    
    try {
      const data = await askPerplexity(prompt)
      console.log('Perplexity API response:', data)
      const content = data.choices?.[0]?.message?.content || ''
      // Enhanced parsing
      const { summary, actionItems, references } = parseInsightSections(content)
      console.log('parseInsightSections output:', { summary, actionItems, references })
      // Always set description to the parsed summary for ALL alert types
      setMemory((mem: MemoryItem[]) => mem.map(item => {
        if (item.id === loadingId) {
          return {
            ...item,
            title: `${title} (Perplexity)`,
            description: summary, // Only the summary, not the full markdown
            actionItems,
            references,
            timestamp: 'just now',
            type
          }
        }
        return item;
      }))
    } catch (e) {
      setMemory((mem: MemoryItem[]) => mem.map(item =>
        item.id === loadingId
          ? {
              ...item,
              title: `${title} (Error)`,
              description: 'Failed to generate Perplexity insight.',
              timestamp: 'just now',
              type
            }
          : item
      ))
      toast.error('Perplexity API error', { description: String(e) })
    }
  }

  // Modal for full details and pin action
  let modalPanelContent: React.ReactNode = null;
  if (modalContent) {
    // Use advanced formatting for competitive analysis and similar briefs
    const isCompetitive = modalContent.title?.toLowerCase().includes('competitive intelligence') || modalContent.title?.toLowerCase().includes('competitive analysis');
    if (isCompetitive) {
      modalPanelContent = (
        <FormattedInsight
          title={modalContent.title.replace(/\s*\(Loading\.+\)/, '')}
          description={modalContent.description}
          type={modalContent.type}
          timestamp={modalContent.timestamp}
        />
      );
    } else {
      // Fallback: original modal rendering for other alert types
      const fields = getParsedFields(modalContent);
      modalPanelContent = (
        <>
          <div className="flex items-center gap-2 mb-2">
            {modalContent.type === 'board-pack' && <FileText className="h-5 w-5 text-primary" />}
            {modalContent.type === 'brief' && <Sparkles className="h-5 w-5 text-accent" />}
            {modalContent.type === 'alert' && <AlertTriangle className="h-5 w-5 text-yellow-600" />}
            <span className="font-bold text-2xl">{modalContent.title.replace(/\s*\(Loading\.+\)/, '')}</span>
          </div>
          <div className="text-xs text-muted-foreground mb-4">{modalContent.timestamp} &middot; Type: <span className="capitalize font-semibold">{modalContent.type === 'board-pack' ? 'Board Pack' : modalContent.type === 'brief' ? 'Brief' : 'Alert'}</span></div>
          <div className="prose prose-lg max-w-none text-foreground overflow-y-auto mb-6" style={{ maxHeight: '60vh' }}>
            {renderSummary(fields.summary || modalContent.description)}
          </div>
          {fields.actionItems && fields.actionItems.length > 0 && (
            <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
              <div className="font-bold text-xl mb-4 flex items-center gap-2 text-yellow-700">
                <Sparkles className="h-5 w-5 text-yellow-500" /> Action Items
        </div>
              <ActionItemsList items={fields.actionItems} />
          </div>
        )}
          {fields.references && fields.references.length > 0 && (
            <div className="mt-8 text-xs text-muted-foreground">
              <div className="font-semibold mb-1">References:</div>
              <ol className="list-decimal pl-5 space-y-1">
                {fields.references.map((ref: string, idx: number) => (
                  <li key={idx} id={`ref-${idx + 1}`} className="mb-1">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{ref}</ReactMarkdown>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <button
              className="px-4 py-2 rounded bg-accent text-accent-foreground text-sm font-semibold hover:bg-accent/80 focus:ring-2 focus:ring-accent transition"
              onClick={() => { setPinnedId(modalContent.id); setModalOpen(false); }}
            >Pin as Executive Summary</button>
            {pinnedId === modalContent.id && (
              <span className="inline-block px-2 py-0.5 rounded bg-accent text-accent-foreground text-xs font-bold ml-2">Pinned</span>
                  )}
                </div>
        </>
      );
    }
  }

  return (
    <>
      {/* Hero/Welcome Section */}
      <section className="mb-10">
        <div className="relative rounded-3xl shadow-xl bg-gradient-to-br from-primary/10 to-accent/10 p-8 flex flex-col items-start mb-8 overflow-hidden animate-fade-in">
          <div className="absolute inset-0 pointer-events-none" style={{background: 'radial-gradient(circle at 80% 20%, rgba(255,215,100,0.12) 0, transparent 70%)'}}></div>
          <h1 className="text-4xl font-extrabold mb-2 tracking-tight">Welcome, Executive</h1>
          <p className="text-lg text-muted-foreground mb-4">Your Perplexity-powered boardroom copilot.</p>
          </div>
      </section>
      {/* Boardroom Intelligence (Competitive Threat Only) */}
      <section id="boardroom-intelligence" className="mb-10">
        <h2 className="text-2xl font-bold mb-2">Executive Intelligence</h2>
        <div className="flex flex-col gap-8 w-full">
          {/* Competitive Threat Alert Card */}
          <CompetitiveThreatAlertCard />

          {/* Original BenchmarkBoard removed */}
          {/*
          <div className="mt-8">
             <BenchmarkBoard />
          </div>
          */}

          {/* Dashboard sections */}
          {/* ... existing code for Board Pack and modals ... */}
        </div>
      </section>

      {/* --- New Executive Pulse Section --- */}
      {/* This section should be added here once implemented */}
      {/*
      <section id="executive-pulse" className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Executive Pulse</h2>
        <ExecutivePulse />
      </section>
      */}

      {/* Board Pack section remains as is (recent briefs/alerts) */}
      {/* Remove or comment out Key Metrics & Trends, charts, and any unrelated dashboard widgets */}
      {/* ... existing code for Board Pack and modals below this point ... */}
    </>
  )
} 