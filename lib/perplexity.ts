export async function askPerplexity(question: string) {
  const res = await fetch('/api/perplexity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: question }),
  })
  if (!res.ok) throw new Error('Perplexity API error')
  return res.json()
} 