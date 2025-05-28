import * as React from "react"

const dummyInsights = [
  {
    id: 1,
    title: "AI Adoption in Financial Services",
    summary: "Major banks are accelerating AI investments to improve risk management and customer experience.",
    date: "2025-05-08"
  },
  {
    id: 2,
    title: "Competitor Expansion Alert",
    summary: "Key competitor has announced entry into the APAC market, signaling increased regional competition.",
    date: "2025-05-07"
  },
  {
    id: 3,
    title: "Regulatory Update: Data Privacy",
    summary: "New EU regulations will require additional compliance measures for cross-border data transfers.",
    date: "2025-05-06"
  }
]

export function KnowledgeBase() {
  return (
    <ul className="space-y-4">
      {dummyInsights.map(insight => (
        <li key={insight.id} className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded shadow">
          <div className="font-semibold">{insight.title}</div>
          <div className="text-sm text-zinc-500 dark:text-zinc-400">{insight.date}</div>
          <div className="text-sm mt-1">{insight.summary}</div>
        </li>
      ))}
    </ul>
  )
} 