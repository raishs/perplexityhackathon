"use client"
import { useState } from "react"
import { toast } from "@/components/ui/use-toast"

const initialBriefs = [
  {
    title: "AI Adoption in Financial Services",
    summary: "Key trends and risks for 2024. Web sources: McKinsey, Perplexity, Gartner.",
    author: "Samantha Lee",
    date: "2024-06-01",
    tags: ["AI", "Finance", "Trends"],
  },
  {
    title: "Competitor Analysis: Acme Corp vs. Beta Inc.",
    summary: "Market share, product launches, and leadership changes in Q2.",
    author: "David Kim",
    date: "2024-05-28",
    tags: ["Competitor", "Market", "Leadership"],
  },
  {
    title: "ESG Regulatory Landscape Update",
    summary: "New EU and US regulations impacting reporting and compliance.",
    author: "Priya Patel",
    date: "2024-05-25",
    tags: ["ESG", "Regulation", "Compliance"],
  },
]

type Brief = typeof initialBriefs[number] & { animate?: boolean }

export default function ResearchPage() {
  const [briefs, setBriefs] = useState<Brief[]>(initialBriefs)

  function handleWhatIfScenario() {
    setBriefs([
      {
        title: "What If: Competitor Enters APAC Market?",
        summary: "Scenario analysis: If Beta Inc. enters APAC, expect price competition, talent wars, and regulatory hurdles. Recommended: Accelerate local partnerships.",
        author: "Nhika AI",
        date: new Date().toISOString().slice(0, 10),
        tags: ["Scenario", "APAC", "Competitor"],
        animate: true,
      },
      ...briefs,
    ])
    toast({
      title: "Scenario Generated!",
      description: "A new 'What If' scenario has been added.",
    })
  }

  return (
    <div className="max-w-4xl mx-auto mt-8 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Research Briefs</h1>
        <button
          className="rounded-lg bg-accent text-accent-foreground px-4 py-2 font-semibold shadow transition-transform duration-200 hover:scale-105 hover:bg-accent/80"
          onClick={handleWhatIfScenario}
        >
          Generate What-If Scenario
        </button>
      </div>
      <div className="grid gap-6">
        {briefs.map((brief, idx) => (
          <div key={idx} className={`rounded-xl bg-card shadow p-6 flex flex-col gap-2 border transition-all duration-500 hover:scale-102 ${brief.animate ? 'animate-fade-in' : ''}`}>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-lg">{brief.title}</span>
              <span className="ml-auto text-xs text-muted-foreground">{brief.date}</span>
            </div>
            <div className="text-sm text-muted-foreground">{brief.summary}</div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-foreground">By {brief.author}</span>
              {brief.tags.map((tag) => (
                <span key={tag} className="ml-2 px-2 py-0.5 rounded bg-accent text-xs text-accent-foreground font-medium">{tag}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 