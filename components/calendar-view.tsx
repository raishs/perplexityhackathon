import * as React from "react"

const dummyEvents = [
  {
    id: 1,
    title: "Board Meeting",
    time: "2025-05-10 09:00",
    description: "Quarterly board review."
  },
  {
    id: 2,
    title: "Strategy Session",
    time: "2025-05-11 14:00",
    description: "Discuss market expansion."
  },
  {
    id: 3,
    title: "Earnings Call",
    time: "2025-05-12 16:00",
    description: "Q1 earnings and outlook."
  }
]

export function CalendarView() {
  return (
    <ul className="space-y-4">
      {dummyEvents.map(event => (
        <li key={event.id} className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded shadow">
          <div className="font-semibold">{event.title}</div>
          <div className="text-sm text-zinc-500 dark:text-zinc-400">{event.time}</div>
          <div className="text-sm mt-1">{event.description}</div>
        </li>
      ))}
    </ul>
  )
} 