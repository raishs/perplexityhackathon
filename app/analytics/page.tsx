"use client"

import { AiAdoptionChart } from "@/components/analytics/ai-adoption-chart"

const kpis = [
  { label: "Revenue (Q2)", value: "$12.4M", change: "+8% YoY" },
  { label: "Market Share", value: "24.1%", change: "+1.2%" },
  { label: "Customer NPS", value: "67", change: "+5" },
  { label: "AI Adoption Rate", value: "78%", change: "+10%" },
]

export default function AnalyticsPage() {
  return (
    <div className="max-w-5xl mx-auto mt-8 animate-fade-in">
      <h1 className="text-2xl font-bold mb-4">Key Metrics & Trends</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="rounded-xl bg-card shadow p-6 border flex flex-col items-center transition-transform duration-300 hover:scale-105">
            <span className="text-2xl font-bold text-primary">{kpi.value}</span>
            <span className="text-sm text-muted-foreground">{kpi.label}</span>
            <span className="text-xs mt-1 text-accent-foreground">{kpi.change}</span>
          </div>
        ))}
      </div>
      <div className="rounded-xl bg-card shadow p-6 border animate-fade-in transition-all duration-500">
        <h2 className="text-lg font-semibold mb-2">AI Adoption Trend (2023-2024)</h2>
        <AiAdoptionChart />
      </div>
    </div>
  )
} 