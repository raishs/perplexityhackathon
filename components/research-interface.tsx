import * as React from "react"

export function ResearchInterface() {
  const [query, setQuery] = React.useState("")
  const [result, setResult] = React.useState<string | null>(null)

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setResult(
      `\nExecutive Summary: Apple Inc. continues to lead the market in innovation, with recent product launches and strong financial performance.\n\nStrategic Implications: Continued investment in R&D and global expansion are recommended.\n\nSource Credibility: Verified (WSJ, Bloomberg, Reuters).`
    )
  }

  return (
    <div>
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          type="text"
          className="flex-1 border rounded px-3 py-2"
          placeholder="Ask a strategic question..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <button type="submit" className="bg-primary text-white px-4 py-2 rounded">Search</button>
      </form>
      {result && (
        <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded shadow">
          <pre className="whitespace-pre-wrap text-sm">{result}</pre>
        </div>
      )}
    </div>
  )
} 