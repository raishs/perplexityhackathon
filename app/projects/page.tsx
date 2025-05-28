const projects = [
  { name: "AI Pilot Rollout", owner: "David Kim", status: "In Progress", deadline: "2024-07-15" },
  { name: "Market Expansion - APAC", owner: "Priya Patel", status: "Planning", deadline: "2024-09-01" },
  { name: "ESG Compliance Update", owner: "Maria Garcia", status: "Completed", deadline: "2024-05-20" },
]

export default function ProjectsPage() {
  return (
    <div className="max-w-4xl mx-auto mt-8">
      <h1 className="text-2xl font-bold mb-4">Projects</h1>
      <div className="grid gap-6">
        {projects.map((project, idx) => (
          <div key={idx} className="rounded-xl bg-card shadow p-6 border flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-lg">{project.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">{project.status}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Owner: {project.owner}</span>
              <span className="ml-auto">Deadline: {project.deadline}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 