"use client"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const aiAdoptionData = [
  { quarter: "Q1 '23", rate: 55 },
  { quarter: "Q2 '23", rate: 60 },
  { quarter: "Q3 '23", rate: 65 },
  { quarter: "Q4 '23", rate: 70 },
  { quarter: "Q1 '24", rate: 75 },
  { quarter: "Q2 '24", rate: 78 },
]

export function AiAdoptionChart() {
  if (!aiAdoptionData || aiAdoptionData.length === 0) {
    return (
      <div className="w-full h-64 bg-muted flex items-center justify-center text-muted-foreground rounded-lg animate-fade-in">
        <span className="text-sm">No data available</span>
      </div>
    )
  }
  return (
    <div className="w-full h-64 bg-muted flex items-center justify-center text-muted-foreground rounded-lg animate-fade-in">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={aiAdoptionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="quarter" />
          <YAxis domain={[50, 80]} tickFormatter={(v) => `${v}%`} />
          <Tooltip formatter={(v) => `${v}%`} />
          <Line type="monotone" dataKey="rate" stroke="#F5B800" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 8 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
} 