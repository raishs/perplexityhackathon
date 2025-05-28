import React, { useState, useEffect } from 'react';
import { askPerplexity } from '@/lib/perplexity';
import { useCompany } from '@/components/context/company-context';
import { useBoardroomMemory } from './context/boardroom-memory';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

// TODO: Add UI library imports for table, modal, buttons, popovers, etc.

/**
 * BenchmarkBoard: Executive benchmarking and peer comparison board
 * - Powered by Perplexity
 * - Visual, source-cited, and boardroom-ready
 */

// Utility: Extract reference mapping from sources section
function extractReferenceLinks(sourcesSection: string): Record<string, string> {
  const refMap: Record<string, string> = {};
  if (!sourcesSection) return refMap;
  // Match lines like '1. [Title](url)' or '1. url' or '1. Title: url'
  const lines = sourcesSection.split(/\n|\r/).map(l => l.trim()).filter(Boolean);
  lines.forEach(line => {
    const match = line.match(/^(\d+)\.\s*(.*)$/);
    if (match) {
      const num = match[1];
      const rest = match[2];
      let url = '';
      let text = rest;
      // Try to extract a markdown link and text
      const mdLinkMatch = rest.match(/\[(.*?)\]\((https?:\/\/[^)]+)\)/);
      if (mdLinkMatch) {
        text = mdLinkMatch[1];
        url = mdLinkMatch[2];
      } else {
        // Or a plain URL
        const plainUrlMatch = rest.match(/(https?:\/\/\S+)/);
        if (plainUrlMatch) {
          url = plainUrlMatch[1];
          // Use URL as text if no title is provided in raw output
          text = url;
        }
      }
      // Store both text and url if url is found
      if (url) refMap[num] = url; // Store URL only for linking
    }
  });
  return refMap;
}

// Utility: Replace [n] with [n](url) in markdown
function linkReferencesInMarkdown(markdown: string, refMap: Record<string, string>): string {
  // Replace [n] with [n](url) if url exists in refMap
  return markdown.replace(/\[(\d+)\]/g, (match, n) => {
    if (refMap[n]) return `[${n}](${refMap[n]})`;
    return match;
  });
}

// Utility: Format sources section as a markdown numbered list
function formatSourcesMarkdown(sourcesSection: string, refMap: Record<string, string>): string {
  let formatted = '';
  if (!sourcesSection || Object.keys(refMap).length === 0) return '';

  // Get the heading (e.g., ### Sources)
  const headingMatch = sourcesSection.match(/^(###?\s*Sources.*)/i);
  if (headingMatch) {
    formatted += headingMatch[1] + '\n\n';
  }

  // Add numbered list items using the refMap
  Object.keys(refMap).sort((a, b) => parseInt(a, 10) - parseInt(b, 10)).forEach(num => {
    const url = refMap[num];
    // Try to find the original line to get potential title/text
    const originalLineMatch = sourcesSection.match(new RegExp(`^${num}\\.\\\\s*(.*)$`, 'm'));
    let text = url; // Default to URL as text
    if (originalLineMatch && originalLineMatch[1]) {
       // Use the part after the number as text, excluding markdown link format if present
       text = originalLineMatch[1].replace(/\[(.*?)\]\(https?:\/\/[^)]+\)/, '$1').trim();
       if (!text) text = url; // Fallback if extracted text is empty after cleanup
    }

    formatted += `${num}. [${text}](${url})\n`;
  });

  return formatted.trim();
}

// Robust competitor mapping
const competitorMap: Record<string, string[]> = {
  'perplexity': ['OpenAI', 'Google', 'Anthropic', 'Cohere', 'Mistral AI'],
  'nvidia': ['AMD', 'Intel', 'Apple', 'Qualcomm'],
  'openai': ['Anthropic', 'Google', 'Perplexity', 'Cohere'],
  'google': ['Microsoft', 'Meta', 'Amazon', 'Perplexity'],
  'apple': ['Samsung', 'Google', 'Microsoft', 'Amazon'],
  'microsoft': ['Google', 'Apple', 'Amazon'],
  'amazon': ['Microsoft', 'Google', 'Alibaba', 'Meta'],
  'meta': ['Google', 'Microsoft', 'Amazon', 'ByteDance'],
  // Add more common companies here
};

// Fallback competitors for unknown companies
const fallbackCompetitors = ['OpenAI', 'Google', 'Anthropic'];

export default function BenchmarkBoard({ onClose }: { onClose: () => void }) {
  const { company: currentCompany } = useCompany();
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<string[]>(["Revenue", "R&D Spend", "Product Launches", "Regulatory Risk"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tableMarkdown, setTableMarkdown] = useState('');
  const { setMemory } = useBoardroomMemory();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [competitorInput, setCompetitorInput] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [usingFallbackCompetitors, setUsingFallbackCompetitors] = useState(false);

  // Fetch competitors based on company name
  useEffect(() => {
    const normalizedCompany = (currentCompany || '').trim().toLowerCase();
    const foundCompetitors = competitorMap[normalizedCompany];

    if (foundCompetitors) {
      setCompetitors(foundCompetitors);
      setUsingFallbackCompetitors(false);
    } else {
      setCompetitors(fallbackCompetitors);
      setUsingFallbackCompetitors(true);
    }
  }, [currentCompany]);

  // Generate benchmarking table via Perplexity
  const generateBenchmark = async () => {
    setLoading(true);
    setError(null);
    setTableMarkdown('');
    try {
      // See: https://docs.perplexity.ai/guides/prompt-guide for best practices
      // Updated prompt to use selected metrics and competitors
      const prompt = `Create a markdown table comparing ${currentCompany} to the following competitors: ${competitors.join(', ')} across these metrics: ${metrics.join(', ')}.\n\nStructure the table with the Company as the first column, followed by the requested metrics as columns. Include ${currentCompany} as the first row, followed by the competitors. For each value, include a source citation (URL or reference) as a superscript [n]. If a value is not available, state 'N/A' and briefly explain why in a note below the table.\n\nInclude a '### Sources' section below the table with a numbered markdown list of all sources, including URLs.\n\nReturn ONLY the markdown table and the Sources section. Do NOT include any other narrative or explanation outside these sections.`;
      const data = await askPerplexity(prompt);
      setTableMarkdown(data.choices?.[0]?.message?.content || '');
    } catch (e: any) {
      setError('Failed to generate benchmark.');
    }
    setLoading(false);
  };

  const handleSave = () => {
    if (!tableMarkdown) return;
    setMemory(prev => [
      ...prev,
      {
        id: Date.now(),
        title: `Benchmark: ${currentCompany} vs ${competitors.join(', ')}`,
        content: tableMarkdown,
        description: 'Benchmark comparison table',
        timestamp: new Date().toLocaleString(),
        type: 'board-pack',
        references: {},
      },
    ]);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 1500);
  };

  // Add competitor chip
  const addCompetitor = () => {
    if (competitorInput && !competitors.includes(competitorInput)) {
      setCompetitors([...competitors, competitorInput]);
      setCompetitorInput('');
    }
  };
  // Remove competitor chip
  const removeCompetitor = (c: string) => setCompetitors(competitors.filter(x => x !== c));

  // Toggle metric
  const toggleMetric = (m: string) => {
    setMetrics(metrics.includes(m) ? metrics.filter(x => x !== m) : [...metrics, m]);
  };

  // Executive-grade metrics for quick selection
  const allMetrics = ["Revenue", "R&D Spend", "Product Launches", "Regulatory Risk", "Market Share", "Employee Count", "Profit Margin", "Valuation"];

  // Extract notes/explanations and sources for collapsible panels
  const notesMatch = tableMarkdown.match(/(###?\s*Notes[\s\S]*?)(?=###|$)/i);
  const sourcesMatch = tableMarkdown.match(/(###?\s*Sources[\s\S]*)/i);
  const mainTable = tableMarkdown
    .replace(notesMatch ? notesMatch[1] : '', '')
    .replace(sourcesMatch ? sourcesMatch[1] : '', '')
    .trim();

  // --- Reference link post-processing and sources formatting ---
  const refMap = extractReferenceLinks(sourcesMatch ? sourcesMatch[1] : '');
  const processedMainTable = linkReferencesInMarkdown(mainTable, refMap);
  const formattedSources = formatSourcesMarkdown(sourcesMatch ? sourcesMatch[1] : '', refMap);

  return (
    <div className="rounded-3xl bg-white dark:bg-zinc-900 shadow-2xl p-8 max-w-4xl mx-auto border border-accent flex flex-col gap-8 relative">
      <div className="flex items-center justify-between mb-4 sticky top-0 z-20 bg-white dark:bg-zinc-900 rounded-t-2xl pb-2 border-b border-accent/20">
        <h2 className="text-3xl font-extrabold tracking-tight">Instant Benchmarking & Peer Comparison Board</h2>
        <button
          className="px-5 py-2 rounded-lg bg-primary text-primary-foreground font-semibold shadow hover:bg-primary/90 focus:ring-2 focus:ring-accent transition text-base"
          onClick={generateBenchmark}
          disabled={loading}
        >
          {loading ? 'Generating…' : 'Generate Benchmark'}
        </button>
      </div>
      {/* Competitor editing UI */}
      <div className="flex flex-wrap gap-2 mb-2 items-center">
        <span className="font-semibold">Competitors:</span>
        {competitors.map(c => (
          <span key={c} className="bg-accent text-accent-foreground rounded-full px-3 py-1 text-sm flex items-center gap-1 shadow-sm">
            {c}
            <button className="ml-1 text-xs" onClick={() => removeCompetitor(c)} title="Remove">×</button>
          </span>
        ))}
        <input
          className="border rounded px-2 py-1 text-sm w-32"
          type="text"
          value={competitorInput}
          onChange={e => setCompetitorInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addCompetitor(); }}
          placeholder="Add competitor"
          disabled={loading}
        />
        <button className="text-xs px-2 py-1 rounded bg-muted text-foreground border ml-1" onClick={addCompetitor} disabled={loading || !competitorInput}>Add</button>
      </div>
      {/* Message for fallback competitors */}
      {usingFallbackCompetitors && competitors.length > 0 && (
        <div className="text-xs text-muted-foreground mt-1 mb-2">
          Competitors auto-suggested. Add or remove to refine.
        </div>
      )}
      {/* Metric selection UI */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <span className="font-semibold">Metrics:</span>
        {allMetrics.map(m => (
          <label key={m} className="flex items-center gap-1 text-sm cursor-pointer">
            <input type="checkbox" checked={metrics.includes(m)} onChange={() => toggleMetric(m)} disabled={loading} />
            {m}
          </label>
        ))}
      </div>
      {/* Table rendering */}
      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
          Researching live financial data…
        </div>
      )}
      {error && <div className="text-red-600">{error}</div>}
      {!loading && !error && !tableMarkdown && (
        <div className="text-muted-foreground">Click "Generate Benchmark" to compare {currentCompany} to its peers across key metrics.</div>
      )}
      {/* Modern card for Perplexity output */}
      {tableMarkdown && (
        <div className="relative rounded-2xl shadow-lg border border-accent bg-gradient-to-br from-primary/5 to-accent/5 p-6 max-w-3xl mx-auto mt-2">
          <div className="overflow-x-auto prose prose-lg max-w-none text-foreground">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={{
                table: ({node, ...props}) => <table className="min-w-full border text-sm my-2 rounded-xl overflow-hidden shadow" {...props} />,
                th: ({node, ...props}) => <th className="border px-4 py-3 bg-muted font-bold sticky top-0 z-10" {...props} />,
                td: ({node, ...props}) => <td className="border px-4 py-2" {...props} />,
                a: ({node, ...props}) => <a className="underline text-primary hover:text-primary/80 transition" target="_blank" rel="noopener noreferrer" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-xl font-bold mt-6 mb-2 text-accent" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-2xl font-bold mt-8 mb-3 text-primary" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc pl-6 space-y-2" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal pl-6 space-y-2" {...props} />,
                li: ({node, ...props}) => <li className="mb-1" {...props} />,
                blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-accent pl-4 italic text-muted-foreground my-4" {...props} />,
                code: ({node, ...props}) => <code className="bg-muted px-1 py-0.5 rounded text-sm" {...props} />,
              }}
            >{processedMainTable}</ReactMarkdown>
          </div>
          {/* Collapsible Notes/Explanations */}
          {notesMatch && (
            <div className="mt-6">
              <button
                className="text-accent font-semibold underline text-base mb-2"
                onClick={() => setShowNotes(v => !v)}
              >
                {showNotes ? 'Hide' : 'Show'} Notes & Explanations
              </button>
              {showNotes && (
                <div className="prose prose-base max-w-none bg-accent/10 rounded-xl p-4 border border-accent/20 mt-2">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{notesMatch[1]}</ReactMarkdown>
                </div>
              )}
            </div>
          )}
          {/* Collapsible Sources */}
          {sourcesMatch && (
            <div className="mt-6">
              <button
                className="text-accent font-semibold underline text-base mb-2"
                onClick={() => setShowSources(v => !v)}
              >
                {showSources ? 'Hide' : 'Show'} Sources
              </button>
              {showSources && (
                <div className="prose prose-base max-w-none bg-accent/10 rounded-xl p-4 border border-accent/20 mt-2">
                  {/* Explicitly render as an ordered list for consistent styling */}
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      // Override default li rendering to ensure numbering is visible and consistent
                      li: ({node, children, ...props}) => {
                        // ReactMarkdown might process the number and dot separately, or not at all if prose interferes.
                        // We want to ensure the number is displayed clearly and the text aligns.
                        // A simple approach is to rely on the rendered markdown list styling.
                        return <li className="mb-2 leading-relaxed flex items-start gap-2" {...props}><span className="font-bold text-accent-foreground">{node?.position?.start.line}.</span> <span>{children}</span></li>;
                      },
                      a: ({node, ...props}) => <a className="underline text-primary hover:text-primary/80 transition" target="_blank" rel="noopener noreferrer" {...props} />,
                      // Prevent rendering headings, etc. within sources if they somehow appeared
                      h1: () => null,
                      h2: () => null,
                      h3: () => null,
                      h4: () => null,
                      h5: () => null,
                      h6: () => null,
                      // Add any other components to style or exclude
                    }}
                  >{formattedSources}</ReactMarkdown>
                </div>
              )}
            </div>
          )}
          {/* Fade-out effect at bottom for scroll hint */}
          <div className="pointer-events-none absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-white dark:from-zinc-900 to-transparent rounded-b-2xl" />
        </div>
      )}
      {/* Save to Board Pack */}
      {tableMarkdown && (
        <div className="flex items-center gap-2 mt-4">
          <button
            className="px-4 py-2 rounded bg-accent text-accent-foreground font-semibold shadow hover:bg-accent/90 focus:ring-2 focus:ring-accent transition text-sm"
            onClick={handleSave}
            disabled={saveSuccess}
          >
            {saveSuccess ? '✔️ Saved!' : 'Save to Board Pack'}
          </button>
        </div>
      )}
    </div>
  );
} 