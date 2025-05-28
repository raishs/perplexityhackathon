import { MainLayout } from "@/components/layout/main-layout"

const messages = [
  { sender: "Alex Morgan", subject: "Board Meeting Follow-up", date: "2024-06-10", content: "Please review the action items from today's board meeting." },
  { sender: "Samantha Lee", subject: "Q2 Financials Ready", date: "2024-06-09", content: "The Q2 financial report is finalized and available for review." },
  { sender: "David Kim", subject: "AI Pilot Update", date: "2024-06-08", content: "The AI pilot is on track. See attached for the latest metrics." },
]

export default function MessagesPage() {
  return (
    <div className="max-w-3xl mx-auto mt-8">
      <h1 className="text-2xl font-bold mb-4">Messages</h1>
      <div className="grid gap-6">
        {messages.map((msg, idx) => (
          <div key={idx} className="rounded-xl bg-card shadow p-6 border flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{msg.subject}</span>
              <span className="ml-auto text-xs text-muted-foreground">{msg.date}</span>
            </div>
            <div className="text-sm text-muted-foreground">From: {msg.sender}</div>
            <div className="text-sm">{msg.content}</div>
          </div>
        ))}
      </div>
    </div>
  )
} 