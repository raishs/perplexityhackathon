"use client"
import { useState } from "react"
import { toast } from "@/components/ui/use-toast"

const initialMeetings = [
  {
    title: "Q2 Board Meeting",
    date: "2024-06-10 09:00 AM",
    agenda: [
      "Financial review",
      "AI strategy update",
      "Market expansion plans",
      "Action items review"
    ],
    actionItems: [
      "Finalize Q2 budget",
      "Approve new AI pilot",
      "Assign market research lead"
    ]
  },
  {
    title: "Leadership Sync",
    date: "2024-06-12 02:00 PM",
    agenda: [
      "Team performance",
      "Hiring pipeline",
      "Competitor moves"
    ],
    actionItems: [
      "Schedule 1:1s",
      "Review competitor analysis"
    ]
  }
]

type Meeting = typeof initialMeetings[number] & { animate?: boolean }

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>(initialMeetings)

  function handlePrepForMeeting() {
    setMeetings([
      {
        title: "Prep: M&A Strategy Session",
        date: new Date().toISOString().slice(0, 16).replace("T", " "),
        agenda: [
          "Recent M&A news",
          "Key risks/opportunities",
          "Suggested questions for legal team"
        ],
        actionItems: [
          "Review M&A landscape report",
          "Draft questions for legal"
        ],
        animate: true,
      },
      ...meetings,
    ])
    toast({
      title: "Meeting Prep Generated!",
      description: "A new meeting prep card has been added.",
    })
  }

  return (
    <div className="max-w-3xl mx-auto mt-8 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Upcoming Meetings</h1>
        <button
          className="rounded-lg bg-accent text-accent-foreground px-4 py-2 font-semibold shadow transition-transform duration-200 hover:scale-105 hover:bg-accent/80"
          onClick={handlePrepForMeeting}
        >
          Prep for Meeting
        </button>
      </div>
      <div className="grid gap-6">
        {meetings.map((meeting, idx) => (
          <div key={idx} className={`rounded-xl bg-card shadow p-6 border transition-all duration-500 hover:scale-102 ${meeting.animate ? 'animate-fade-in' : ''}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold text-lg">{meeting.title}</span>
              <span className="ml-auto text-xs text-muted-foreground">{meeting.date}</span>
            </div>
            <div className="mb-2">
              <span className="font-medium text-sm">Agenda:</span>
              <ul className="list-disc ml-6 text-sm text-muted-foreground">
                {meeting.agenda.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
            <div>
              <span className="font-medium text-sm">Action Items:</span>
              <ul className="list-disc ml-6 text-sm text-accent-foreground">
                {meeting.actionItems.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 