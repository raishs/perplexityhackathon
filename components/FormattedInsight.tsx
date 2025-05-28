import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Sparkles, FileText, ArrowRight, AlertTriangle, CheckCircle } from 'lucide-react';

// Helper: Render a styled markdown table
function StyledMarkdownTable({ markdown }: { markdown: string }) {
  return (
    <div className="overflow-x-auto my-4">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          table: ({ node, ...props }) => <table className="min-w-full border text-sm my-2" {...props} />,
          th: ({ node, ...props }) => <th className="border px-3 py-2 bg-muted font-bold" {...props} />,
          td: ({ node, ...props }) => <td className="border px-3 py-2" {...props} />,
        }}
      >{markdown}</ReactMarkdown>
    </div>
  );
}

// Helper: Split summary into paragraphs for readability
function renderSummary(summary: string) {
  if (summary.includes('#') || summary.includes('- ') || summary.includes('* ')) {
    return <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{summary}</ReactMarkdown>;
  }
  const paras = summary
    .replace(/([.!?])\n(?=[A-Z])/g, '$1\n\n')
    .split(/\n{2,}/)
    .map(para => para.trim())
    .filter(Boolean);
  return paras.map((para, idx) => (
    <p key={idx} className="mb-4 text-base leading-relaxed">{para}</p>
  ));
}

// Helper: Parse markdown into sections
function parseSections(markdown: string) {
  const sectionRegex = /###?\s+([\w\s\-&]+)\n([\s\S]*?)(?=\n###?\s|$)/g;
  const sections: { heading: string, content: string }[] = [];
  let match;
  while ((match = sectionRegex.exec(markdown)) !== null) {
    sections.push({ heading: match[1].trim(), content: match[2].trim() });
  }
  return sections;
}

const iconMap: Record<string, JSX.Element> = {
  'Executive Summary': <Sparkles className="h-6 w-6 text-accent" />,
  'Recent High-Impact Competitor Moves': <ArrowRight className="h-5 w-5 text-blue-500" />,
  'Market Shifts, Threats & Opportunities': <AlertTriangle className="h-5 w-5 text-yellow-600" />,
  'Board-Ready Recommendations': <CheckCircle className="h-5 w-5 text-green-600" />,
  'References': <FileText className="h-5 w-5 text-muted-foreground" />,
};

export interface FormattedInsightProps {
  title: string;
  description: string;
  type: 'board-pack' | 'brief' | 'alert';
  timestamp?: string;
}

export function FormattedInsight({ title, description, type, timestamp }: FormattedInsightProps) {
  // Remove a leading 'Executive Summary' heading from the description, if present
  const cleanedDescription = description.replace(/^#+\s*Executive Summary\s*\n?/i, '').replace(/^\s+/, '');
  const sections = parseSections(cleanedDescription);
  return (
    <div className="space-y-10">
      {sections.map(({ heading, content }, idx) => (
        <div key={idx}>
          {/* Section Heading with colored divider */}
          <div className="flex items-center gap-2 mb-3 mt-6">
            <div className={`h-7 w-1 rounded bg-${heading === 'Executive Summary' ? 'accent' : heading === 'Recent High-Impact Competitor Moves' ? 'blue-400' : heading === 'Market Shifts, Threats & Opportunities' ? 'yellow-400' : heading === 'Board-Ready Recommendations' ? 'green-400' : 'muted-foreground'}`}></div>
            {iconMap[heading] || <Sparkles className="h-5 w-5 text-accent" />}
            <span className={`font-bold ${idx === 0 ? 'text-2xl' : 'text-xl'} text-foreground`}>{heading}</span>
          </div>
          {/* Executive Summary: larger font, more spacing */}
          {heading === 'Executive Summary' ? (
            <div className="text-lg leading-relaxed mb-6 mt-2">{renderSummary(content)}</div>
          ) : null}
          {/* Board-Ready Recommendations: Action Items block, only if there are items */}
          {heading === 'Board-Ready Recommendations' && content.split(/\n+/).filter(Boolean).length > 0 ? (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
              <div className="font-bold text-xl mb-4 flex items-center gap-2 text-yellow-700">
                <Sparkles className="h-5 w-5 text-yellow-500" /> Action Items
              </div>
              <ul className="list-none pl-0 space-y-3">
                {content.split(/\n+/).filter(Boolean).map((rec, i) => {
                  // Remove leading number and bold markdown
                  let clean = rec.replace(/^\d+\.\s*/, '');
                  const boldMatch = clean.match(/^\*\*(.+?)\*\*/);
                  let main = clean;
                  if (boldMatch) {
                    main = `<strong>${boldMatch[1]}</strong>` + clean.replace(/^\*\*(.+?)\*\*:?\s*/, '');
                  }
                  return (
                    <li key={i} className="flex items-start gap-3 text-base text-foreground">
                      <span className="text-green-600 mt-0.5 text-lg">✅</span>
                      <span dangerouslySetInnerHTML={{ __html: main }} />
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
          {/* References: visually separated card */}
          {heading === 'References' ? (
            <div className="mt-8 text-xs text-muted-foreground">
              <ol className="list-decimal pl-5 space-y-1">
                {content.split(/\n+/).filter(Boolean).map((ref, i) => (
                  <li key={i} className="mb-1">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{ref}</ReactMarkdown>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
          {/* Table: if markdown table present */}
          {content.includes('|---') ? <StyledMarkdownTable markdown={content} /> : null}
          {/* All other sections: bulleted list with large colored bullets */}
          {heading === 'Recent High-Impact Competitor Moves' ? (
            <ul className="list-disc pl-8 space-y-3">
              {content.split(/\n+/).filter(Boolean).map((item, i) => {
                // Remove bullet markdown
                const cleanItem = item.replace(/^[-*+]\s*/, '');
                // Extract company name (bold markdown at start)
                const companyMatch = cleanItem.match(/^\*\*(.+?)\*\*/);
                // Extract 'Strategic Implication for Roche' (bold markdown anywhere)
                const implicationMatch = cleanItem.match(/\*\*(Strategic Implication for Roche.*?)\*\*/);
                // Remove both bold markdowns from main text
                let mainText = cleanItem
                  .replace(/^\*\*(.+?)\*\*/, companyMatch ? `<strong>${companyMatch[1]}</strong>` : '')
                  .replace(/\*\*(Strategic Implication for Roche.*?)\*\*/, '')
                  .replace(/^\s*:\s*/, '')
                  .trim();
                return (
                  <li key={i} className="text-base text-foreground flex flex-col gap-1">
                    <div className="flex items-start gap-2">
                      <span className="text-blue-500 text-lg">•</span>
                      <span dangerouslySetInnerHTML={{ __html: mainText }} />
                    </div>
                    {implicationMatch && (
                      <div className="ml-8 mt-1 text-base font-bold text-foreground">{implicationMatch[1]}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            heading !== 'Executive Summary' && heading !== 'Board-Ready Recommendations' && heading !== 'References' && !content.includes('|---') ? (
              <ul className="list-disc pl-8 space-y-3">
                {content.split(/\n+/).filter(Boolean).map((item, i) => (
                  <li key={i} className="text-base text-foreground flex items-start gap-2">
                    <span className="text-blue-500 text-lg">•</span>
                    <span>{item.replace(/^[-*+]\s*/, '')}</span>
                  </li>
                ))}
              </ul>
            ) : null
          )}
        </div>
      ))}
      {/* Footer */}
      {timestamp && (
        <div className="text-xs text-muted-foreground mt-4">{timestamp} &middot; Type: <span className="capitalize font-semibold">{type === 'board-pack' ? 'Board Pack' : type === 'brief' ? 'Brief' : 'Alert'}</span></div>
      )}
    </div>
  );
} 