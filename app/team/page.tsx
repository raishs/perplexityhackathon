import { MainLayout } from "@/components/layout/main-layout"

const team = [
  { name: "Alex Morgan", role: "CEO", avatar: "https://randomuser.me/api/portraits/men/32.jpg" },
  { name: "Samantha Lee", role: "CFO", avatar: "https://randomuser.me/api/portraits/women/44.jpg" },
  { name: "David Kim", role: "CTO", avatar: "https://randomuser.me/api/portraits/men/45.jpg" },
  { name: "Priya Patel", role: "Chief Strategy Officer", avatar: "https://randomuser.me/api/portraits/women/65.jpg" },
  { name: "Maria Garcia", role: "Chief Legal Officer", avatar: "https://randomuser.me/api/portraits/women/68.jpg" },
]

export default function TeamPage() {
  return (
    <div className="max-w-4xl mx-auto mt-8">
      <h1 className="text-2xl font-bold mb-4">Executive Team</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {team.map((member, idx) => (
          <div key={idx} className="rounded-xl bg-card shadow p-6 flex flex-col items-center border">
            <img src={member.avatar} alt={member.name} className="w-16 h-16 rounded-full mb-2 border-2 border-accent" />
            <span className="font-semibold text-lg">{member.name}</span>
            <span className="text-sm text-muted-foreground">{member.role}</span>
          </div>
        ))}
      </div>
    </div>
  )
} 