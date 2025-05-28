import React, { useState, useMemo, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { askPerplexity } from '@/lib/perplexity';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useBoardroomMemory } from './context/boardroom-memory';
import { useCompany } from '@/components/context/company-context';
import BenchmarkBoard from '../components/BenchmarkBoard';

function parseMarkdownSections(markdown: string) {
  // Split by headings (### or ##) and keep the heading as the section title
  const sectionRegex = /^(###? .*)$/gm;
  const matches: { match: string; index: number }[] = [];
  let match;
  while ((match = sectionRegex.exec(markdown)) !== null) {
    matches.push({ match: match[1], index: match.index! });
  }
  if (matches.length === 0) {
    return [{ title: 'Full Brief', content: markdown }];
  }
  const sections = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i < matches.length - 1 ? matches[i + 1].index : markdown.length;
    const title = matches[i].match.replace(/^#+\s*/, '');
    // Skip the References section as a standalone section
    if (title.toLowerCase().startsWith('references')) continue;
    const content = markdown.slice(start + matches[i].match.length, end).trim();
    sections.push({ title, content });
  }
  return sections;
}

function postProcessCitations(markdown: string): string {
  // Find the References section
  const refSectionMatch = markdown.match(/(### References[\s\S]*)/i);
  let processed = markdown;
  if (refSectionMatch) {
    const refSection = refSectionMatch[1];
    // Add anchor tags to each reference (assume lines starting with a number and a dot)
    const refAnchored = refSection.replace(/^(\d+)\.?\s+/gm, (m, n) => `<a id='ref${n}'>${n}.</a> `);
    processed = processed.replace(refSection, refAnchored);
  }
  // Replace all [n] or [n][m] with [n](#refn) links, but avoid inside already-linked text
  processed = processed.replace(/\[(\d+)\](?!\()/g, (m, n) => `[${n}](#ref${n})`);
  // Handle multiple citations like [1][3] -> [1](#ref1)[3](#ref3)
  processed = processed.replace(/\[(\d+)\]\[(\d+)\]/g, (m, n1, n2) => `[${n1}](#ref${n1})[${n2}](#ref${n2})`);
  return processed;
}

function extractReferences(markdown: string): Record<string, string> {
  // Find the References section (allow for extra whitespace)
  const refSectionMatch = markdown.match(/(###\s*References[\s\S]*)/i);
  if (!refSectionMatch) return {};
  const refSection = refSectionMatch[1];
  // Extract lines like '1. Some reference text ...' or '1. [Title](url) ...'
  const refLines = refSection.split(/\n|\r/).filter(line => /^\s*\d+\./.test(line.trim()));
  const refs: Record<string, string> = {};
  refLines.forEach(line => {
    const match = line.match(/^(\s*)(\d+)\.\s*(.*)$/);
    if (match) {
      refs[match[2]] = match[3];
    }
  });
  return refs;
}

function getCitationsInSection(sectionContent: string): string[] {
  // Match [1], [2,4], [3-5], etc.
  const matches = sectionContent.match(/\[(\d+(?:,\d+)*(?:-\d+)?)]/g) || [];
  const numbers = new Set<string>();
  matches.forEach(m => {
    // Remove brackets
    const inner = m.slice(1, -1);
    // Split by comma or dash
    inner.split(',').forEach(part => {
      if (part.includes('-')) {
        // Handle ranges like 3-5
        const [start, end] = part.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = start; i <= end; i++) numbers.add(i.toString());
        }
      } else {
        if (part.trim()) numbers.add(part.trim());
      }
    });
  });
  return Array.from(numbers);
}

// Section icon mapping (emoji for demo speed)
const sectionIcons: Record<string, string> = {
  'Executive Summary': '📋',
  'Recent High-Impact Competitor Moves': '⚡',
  'Market Shifts, Threats & Opportunities': '🌐',
  'Board-Ready Recommendations': '✅',
};

function postProcessSectionContent(content: string): string {
  // If the content is a single dense paragraph, split into paragraphs at '. ' (but not inside numbers or abbreviations)
  // Only do this if there are no double newlines already
  if (content && !content.match(/\n\n/)) {
    // Try to split at sentence boundaries for paragraphs
    content = content.replace(/([a-z0-9\)\"]\.)\s+(?=[A-Z])/g, '$1\n\n');
  }
  // Ensure bullet points are preserved (lines starting with '-' or '*')
  // (ReactMarkdown already handles this, but we can normalize spacing)
  content = content.replace(/\n(-|\*)\s/g, '\n$1 ');
  return content;
}

// Map of well-known companies to their main competitors
const competitorMap: Record<string, string[]> = {
  'Perplexity': ['OpenAI', 'Google', 'Anthropic', 'Microsoft'],
  'Intuit': ['H&R Block', 'Xero', 'FreshBooks'],
  'Microsoft': ['Google', 'Apple', 'Amazon', 'Salesforce'],
  'Google': ['Microsoft', 'Apple', 'Meta', 'Amazon'],
  'Apple': ['Samsung', 'Google', 'Microsoft', 'Huawei'],
  'Amazon': ['Walmart', 'Alibaba', 'eBay', 'Target'],
  'Meta': ['TikTok', 'Snap', 'Twitter', 'YouTube'],
  'Tesla': ['Ford', 'GM', 'Rivian', 'Lucid'],
  'OpenAI': ['Anthropic', 'Google', 'Cohere', 'Meta'],
  // Add more as needed
};

function capitalize(str: string) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// --- Fuzzy Matching Utility ---
function normalize(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]/gi, '');
}
function levenshtein(a: string, b: string) {
  const an = a.length, bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix = Array.from({ length: bn + 1 }, (_, i) => [i]);
  for (let j = 0; j <= an; j++) matrix[0][j] = j;
  for (let i = 1; i <= bn; i++) {
    for (let j = 1; j <= an; j++) {
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + (b[i - 1] === a[j - 1] ? 0 : 1)
      );
    }
  }
  return matrix[bn][an];
}
function fuzzyMatchCompany(input: string, candidates: string[]): string {
  const normInput = normalize(input);
  let best = candidates[0];
  let minDist = Infinity;
  for (const c of candidates) {
    const dist = levenshtein(normInput, normalize(c));
    if (dist < minDist) {
      minDist = dist;
      best = c;
    }
  }
  return best;
}

// Scenario explanations
const scenarioExplanations: Record<number, string> = {
  0: "Considers the risk of a major competitor launching a new product directly targeting your company.",
  1: "Explores the impact if a competitor acquires new AI capabilities through acquisition.",
  2: "Analyzes the threat of a disruptive product entering your market.",
  3: "Evaluates the effect of new regulations on your company's core business.",
};

export default function CompetitiveThreatAlertCard() {
  const [openModal, setOpenModal] = useState(false);
  const [competitiveBrief, setCompetitiveBrief] = useState<string>('');
  const [sections, setSections] = useState<{ title: string; content: string }[]>([]);
  const [currentSection, setCurrentSection] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [references, setReferences] = useState<Record<string, string>>({});
  const { memory, setMemory } = useBoardroomMemory();
  const [openBoardPack, setOpenBoardPack] = useState(false);
  const [viewedBoardItem, setViewedBoardItem] = useState<null | { title: string; content: string; references: Record<string, string>; timestamp: string }>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [openScenarioModal, setOpenScenarioModal] = useState(false);
  const [scenarioInput, setScenarioInput] = useState('');
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [scenarioError, setScenarioError] = useState<string | null>(null);
  const [scenarioBrief, setScenarioBrief] = useState<string>('');
  const [scenarioSections, setScenarioSections] = useState<{ title: string; content: string }[]>([]);
  const [scenarioReferences, setScenarioReferences] = useState<Record<string, string>>({});
  const [scenarioCurrentSection, setScenarioCurrentSection] = useState(0);
  const [scenarioSaving, setScenarioSaving] = useState(false);
  const [scenarioSaveSuccess, setScenarioSaveSuccess] = useState(false);
  const { company: currentCompany } = useCompany();
  const capitalizedCompany = useMemo(() => capitalize(currentCompany), [currentCompany]);
  const [showNotes, setShowNotes] = useState(true);
  const [showSources, setShowSources] = useState(true);
  const [usingFallbackCompetitors, setUsingFallbackCompetitors] = useState(false);
  const [openBenchmarkModal, setOpenBenchmarkModal] = useState(false);

  // --- Fuzzy competitor matching ---
  const fuzzyCompany = useMemo(() => {
    const keys = Object.keys(competitorMap);
    if (keys.length === 0) return capitalizedCompany;
    return fuzzyMatchCompany(capitalizedCompany, keys);
  }, [capitalizedCompany]);

  // Use only generic scenarios for unknown companies
  const isKnownCompany = useMemo(() => Object.keys(competitorMap).includes(fuzzyCompany), [fuzzyCompany]);

  // Scenario templates for mapped and generic companies
  const scenarioTemplates = useMemo(() => [
    (c: string, comp: string) => `What if <b>${comp}</b> launches a new enterprise suite targeting ${c}?`,
    (c: string, comp: string) => `What if <b>${comp}</b> acquires a major AI startup?`,
    (c: string, comp: string) => `What if <b>${comp}</b> introduces a disruptive product in ${c}'s market?`,
    (c: string) => `What if new regulations impact ${c}'s core business?`,
    (c: string, comp: string) => `What if <b>${comp}</b> partners with a key customer of ${c}?`,
    (c: string, comp: string) => `What if <b>${comp}</b> launches a price war in ${c}'s sector?`,
  ], []);

  const genericTemplates = useMemo(() => [
    (c: string) => `What if OpenAI launches a new enterprise suite targeting ${c}?`,
    (c: string) => `What if a major competitor launches an AI-powered product in ${c}'s market?`,
    (c: string) => `What if new regulations impact ${c}'s core business?`,
    (c: string) => `What if a new startup disrupts ${c}'s main revenue stream?`,
  ], []);

  // Memoized scenario generation with fuzzy competitor matching
  const demoScenarios = useMemo(() => {
    if (!isKnownCompany) {
      // Only show generic scenarios for unknown companies
      return [
        genericTemplates[0](capitalizedCompany),
        genericTemplates[1](capitalizedCompany),
        genericTemplates[2](capitalizedCompany),
      ];
    }
    const competitors = (competitorMap[fuzzyCompany] || []).filter(Boolean);
    let scenarios: string[] = [];
    for (let i = 0; i < Math.min(3, competitors.length); i++) {
      scenarios.push(scenarioTemplates[i](capitalizedCompany, competitors[i]));
    }
    scenarios.push((scenarioTemplates[3] as (c: string) => string)(capitalizedCompany));
    return scenarios;
  }, [capitalizedCompany, scenarioTemplates, genericTemplates, fuzzyCompany, isKnownCompany]);

  // Use top competitor for placeholder if available, else generic
  const scenarioPlaceholder = useMemo(() => {
    if (isKnownCompany) {
      const competitors = (competitorMap[fuzzyCompany] || []).filter(Boolean);
      if (competitors.length > 0) {
        return `e.g., What if ${competitors[0]} launches a new enterprise suite targeting ${capitalizedCompany}?`;
      }
    }
    return `e.g., What if a major competitor launches a new enterprise suite targeting ${capitalizedCompany}?`;
  }, [capitalizedCompany, fuzzyCompany, isKnownCompany]);

  // --- Use current company for all summary/headline text ---
  const summary = useMemo(() =>
    `Instantly generate a board-ready competitive analysis for ${capitalizedCompany}. Click below to see a Perplexity-powered intelligence brief on recent competitor moves and strategic risks.`,
    [capitalizedCompany]
  );

  const handleCompetitiveAnalysis = async () => {
    setLoading(true);
    setError(null);
    setCompetitiveBrief('');
    setSections([]);
    setCurrentSection(0);
    try {
      const now = new Date();
      const monthYear = now.toLocaleString('default', { month: 'long', year: 'numeric' });
      const prompt = `Perform a deep, board-level competitive analysis for ${capitalizedCompany} as of ${monthYear}.

Structure your response in markdown with the following sections:

### Executive Summary
Write in 2–3 short paragraphs, using double line breaks between paragraphs for readability. Summarize the current competitive landscape and key risks/opportunities.

### Recent High-Impact Competitor Moves
- Use a markdown bullet list: [Competitor], [Move], [Date], [Strategic Implication for Perplexity], [Source]

### Market Shifts, Threats & Opportunities
- Use short paragraphs for each trend or threat, separated by double line breaks. Use bullet points for lists where appropriate.

### Board-Ready Recommendations
- Use a numbered markdown list for each recommendation, with a short explanation for each.

### References
- Numbered markdown list for all sources. For each in-text citation, use [n] (e.g., [3]). Do NOT use HTML or anchor tags—just plain markdown.

Do NOT include a 'Top Competitors' table or section. Focus on recent moves, implications, and board-level recommendations. All claims must be cited with sources as [n] and listed in the References section as a markdown numbered list.`;
      const data = await askPerplexity(prompt);
      let content = data.choices?.[0]?.message?.content || '';
      setCompetitiveBrief(content);
      setSections(parseMarkdownSections(content));
      setReferences(extractReferences(content));
    } catch (e: any) {
      setError('Failed to generate competitive analysis.');
    }
    setLoading(false);
  };

  const handleOpenModal = () => {
    setOpenModal(true);
    handleCompetitiveAnalysis();
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setCompetitiveBrief('');
    setSections([]);
    setCurrentSection(0);
    setError(null);
    setLoading(false);
  };

  const goToPrev = () => setCurrentSection((i) => Math.max(0, i - 1));
  const goToNext = () => setCurrentSection((i) => Math.min(sections.length - 1, i + 1));

  const handleSaveToBoardPack = async () => {
    setSaving(true);
    setSaveSuccess(false);
    const now = new Date();
    const cited = getCitationsInSection(sections[currentSection].content);
    const filteredRefs = cited.filter(num => references[num]);
    // Save references as a mapping { [num: string]: string }
    const refsForSection: { [num: string]: string } = {};
    filteredRefs.forEach(num => { refsForSection[num] = references[num]; });
    setMemory(prev => [
      ...prev,
      {
        id: Date.now(),
        title: sections[currentSection].title,
        content: sections[currentSection].content,
        description: sections[currentSection].content,
        timestamp: now.toLocaleString(),
        type: 'board-pack',
        references: refsForSection,
      },
    ]);
    setTimeout(() => {
      setSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 1500);
    }, 800);
  };

  const handleScenarioPlanning = async (scenario: string) => {
    setScenarioLoading(true);
    setScenarioError(null);
    setScenarioBrief('');
    setScenarioSections([]);
    setScenarioCurrentSection(0);
    try {
      const now = new Date();
      const monthYear = now.toLocaleString('default', { month: 'long', year: 'numeric' });
      const prompt =
        `Given this scenario: "${scenario}", generate a board-level scenario analysis for ${capitalizedCompany} as of ${monthYear}.\n\n` +
        `Structure your response in markdown with the following sections:\n\n` +
        `### Executive Summary\n` +
        `Write in 2–3 short paragraphs, using double line breaks between paragraphs for readability. Summarize the scenario and its strategic implications.\n\n` +
        `### Risks & Opportunities\n` +
        `- Use short paragraphs or bullet points for each risk or opportunity, separated by double line breaks. Use bullet points for lists where appropriate.\n\n` +
        `### Board-Ready Recommendations\n` +
        `- Use a numbered markdown list for each recommendation, with a short explanation for each.\n\n` +
        `### References\n` +
        `- Numbered markdown list for all sources. For each in-text citation, use [n] (e.g., [3]). Do NOT use HTML or anchor tags—just plain markdown.\n\n` +
        `Do NOT include a 'Top Competitors' table or section. Focus on scenario implications, risks, and board-level recommendations. All claims must be cited with sources as [n] and listed in the References section as a markdown numbered list.`;
      const data = await askPerplexity(prompt);
      let content = data.choices?.[0]?.message?.content || '';
      setScenarioBrief(content);
      setScenarioSections(parseMarkdownSections(content));
      setScenarioReferences(extractReferences(content));
    } catch (e: any) {
      setScenarioError('Failed to generate scenario analysis.');
    }
    setScenarioLoading(false);
  };

  // --- Handle saving Scenario Analysis to Board Pack ---
  const handleScenarioSaveToBoardPack = async () => {
    if (!scenarioBrief) return;
    setScenarioSaving(true);
    setScenarioSaveSuccess(false);
    const now = new Date();
    // Assuming scenarioSections and scenarioReferences are available and up-to-date
    // If you need specific citations for the current scenario section, you might need a similar logic to getCitationsInSection
    // For now, saving the whole brief and all references seems reasonable.
    const refsForScenario: { [num: string]: string } = {};
    // If scenarioReferences is a map, use it directly
    if (scenarioReferences && typeof scenarioReferences === 'object' && !Array.isArray(scenarioReferences)) {
       Object.assign(refsForScenario, scenarioReferences);
    }

    setMemory(prev => [
      ...prev,
      {
        id: Date.now(), // Unique ID for the memory item
        title: 'Scenario Analysis', // Or a more specific title if available
        content: scenarioBrief, // Save the full markdown brief
        description: scenarioSections.length > 0 ? scenarioSections[0].content.substring(0, 100) + '...' : '', // Short description from first section
        timestamp: now.toLocaleString(),
        type: 'board-pack',
        references: refsForScenario, // Include extracted references
      },
    ]);

    // Simulate saving delay and show success message
    setTimeout(() => {
      setScenarioSaving(false);
      setScenarioSaveSuccess(true);
      // Hide success message after a short duration
      setTimeout(() => setScenarioSaveSuccess(false), 1500);
    }, 800); // Match the delay of the other save function
  };

  // --- Dynamic scenario state ---
  const [dynamicCompetitors, setDynamicCompetitors] = useState<string[]>([]);
  const [dynamicIndustry, setDynamicIndustry] = useState<string>('');
  const [dynamicProduct, setDynamicProduct] = useState<string>('');
  const [dynamicLoading, setDynamicLoading] = useState(false);
  const [dynamicError, setDynamicError] = useState<string | null>(null);

  // --- Fetch dynamic competitors and industry/product on modal open or company change ---
  useEffect(() => {
    if (!openScenarioModal) return;
    let cancelled = false;
    async function fetchDynamicData() {
      setDynamicLoading(true);
      setDynamicError(null);
      setDynamicCompetitors([]);
      setDynamicIndustry('');
      setDynamicProduct('');
      try {
        // 1. Fetch competitors
        const compPrompt = `List the top 3 direct competitors to ${capitalizedCompany} as of ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}. Return only the company names as a comma-separated list.`;
        const compData = await askPerplexity(compPrompt);
        let competitors: string[] = [];
        if (compData.choices?.[0]?.message?.content) {
          competitors = compData.choices[0].message.content.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
        // 2. Fetch industry/product
        const indPrompt = `What is the primary industry and flagship product or service of ${capitalizedCompany}? Return as: Industry: [industry], Product: [product/service].`;
        const indData = await askPerplexity(indPrompt);
        let industry = '', product = '';
        if (indData.choices?.[0]?.message?.content) {
          const match = indData.choices[0].message.content.match(/Industry:\s*([^,\n]+),?\s*Product:\s*([^,\n]+)/i);
          if (match) {
            industry = match[1].trim();
            product = match[2].trim();
          }
        }
        if (!cancelled) {
          setDynamicCompetitors(competitors);
          setDynamicIndustry(industry);
          setDynamicProduct(product);
        }
      } catch (e) {
        if (!cancelled) setDynamicError('Could not fetch dynamic competitor or industry data.');
      }
      if (!cancelled) setDynamicLoading(false);
    }
    fetchDynamicData();
    return () => { cancelled = true; };
  }, [openScenarioModal, capitalizedCompany]);

  // --- Dynamic scenario templates ---
  const dynamicScenarios = useMemo(() => {
    if (dynamicLoading || dynamicError || (!dynamicCompetitors.length && !dynamicIndustry)) return null;
    // Use dynamic competitors and industry/product if available
    const scenarios: string[] = [];
    if (dynamicCompetitors.length > 0 && dynamicProduct) {
      scenarios.push(`What if <b>${dynamicCompetitors[0]}</b> launches a new ${dynamicProduct.toLowerCase()} targeting ${capitalizedCompany}?`);
    } else if (dynamicCompetitors.length > 0) {
      scenarios.push(`What if <b>${dynamicCompetitors[0]}</b> launches a new product targeting ${capitalizedCompany}?`);
    }
    if (dynamicCompetitors.length > 1 && dynamicIndustry) {
      scenarios.push(`What if <b>${dynamicCompetitors[1]}</b> enters the ${dynamicIndustry.toLowerCase()} market with a disruptive offering?`);
    } else if (dynamicCompetitors.length > 1) {
      scenarios.push(`What if <b>${dynamicCompetitors[1]}</b> launches a disruptive product in ${capitalizedCompany}'s market?`);
    }
    if (dynamicIndustry) {
      scenarios.push(`What if new regulations impact the ${dynamicIndustry.toLowerCase()} sector?`);
    } else {
      scenarios.push(`What if new regulations impact ${capitalizedCompany}'s core business?`);
    }
    return scenarios;
  }, [dynamicCompetitors, dynamicIndustry, dynamicProduct, dynamicLoading, dynamicError, capitalizedCompany]);

  // --- Dynamic scenario placeholder ---
  const dynamicScenarioPlaceholder = useMemo(() => {
    if (dynamicLoading) return 'Loading scenario suggestions…';
    if (dynamicScenarios && dynamicScenarios.length > 0) {
      // Remove HTML tags for placeholder
      return 'e.g., ' + dynamicScenarios[0].replace(/<[^>]+>/g, '');
    }
    return scenarioPlaceholder;
  }, [dynamicScenarios, dynamicLoading, scenarioPlaceholder]);

  return (
    <div className="rounded-xl bg-muted/60 px-6 py-5 shadow flex flex-col gap-3 max-w-xl mx-auto border border-accent">
      <div className="font-bold text-lg mb-1">Competitive Analysis: Instantly generate a board-ready brief for {capitalizedCompany}.</div>
      <div className="text-base text-muted-foreground mb-2">{summary}</div>
      <div className="flex gap-3 mt-2">
        <button
          className="px-4 py-2 rounded bg-primary text-primary-foreground font-semibold shadow hover:bg-primary/90 focus:ring-2 focus:ring-accent transition text-sm"
          onClick={handleOpenModal}
        >
          View Competitive Analysis
        </button>
        <button
          className="px-4 py-2 rounded bg-yellow-400 text-black font-semibold shadow hover:bg-yellow-300 focus:ring-2 focus:ring-accent transition text-sm"
          onClick={() => setOpenScenarioModal(true)}
        >
          What If? Scenario Planning
        </button>
        <button
          className="px-4 py-2 rounded bg-purple-500 text-white font-semibold shadow hover:bg-purple-600 focus:ring-2 focus:ring-purple-700 transition text-sm"
          onClick={() => setOpenBenchmarkModal(true)}
        >
          📊 Benchmark
        </button>
        <button
          className="px-4 py-2 rounded bg-accent text-accent-foreground font-semibold shadow hover:bg-accent/90 focus:ring-2 focus:ring-accent transition text-sm"
          onClick={() => setOpenBoardPack(true)}
        >
          📁 Board Pack
        </button>
      </div>
      {/* Save to Board Pack feedback */}
      {saving && (
        <div className="flex items-center gap-2 mt-2 text-accent-foreground text-sm">
          <svg className="animate-spin h-4 w-4 text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
          Saving to Board Pack…
        </div>
      )}
      {saveSuccess && (
        <div className="flex items-center gap-2 mt-2 text-green-700 dark:text-green-400 text-sm font-semibold">
          <span>✔️ Saved to Board Pack!</span>
        </div>
      )}
      {/* Competitive Analysis Modal */}
      <Dialog open={openModal} onClose={handleCloseModal} className="fixed z-50 inset-0 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
          <Dialog.Panel className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-2xl w-full mx-auto p-8 z-50 animate-fade-in flex flex-col">
            <button onClick={handleCloseModal} className="absolute top-4 right-4 text-muted-foreground hover:text-primary text-xl font-bold focus:outline-none">&times;</button>
            <div className="font-bold text-xl mb-4">Competitive Intelligence Brief</div>
            {loading ? (
              <div className="text-base text-muted-foreground">Generating competitive analysis…</div>
            ) : error ? (
              <div className="text-base text-red-600">{error}</div>
            ) : sections.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-2 font-semibold text-lg">
                    <span className="text-xl align-middle">{sectionIcons[sections[currentSection].title] || '📝'}</span>
                    {sections[currentSection].title}
                  </span>
                  <span className="ml-2 px-2 py-1 rounded-full bg-muted-foreground/10 text-xs text-muted-foreground font-medium border border-muted-foreground/20">
                    Section {currentSection + 1} of {sections.length}
                  </span>
                </div>
                <div
                  className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-muted/30 px-6 py-4 mb-4 prose prose-lg max-w-none text-foreground"
                  style={{ lineHeight: 1.7, letterSpacing: '0.01em', position: 'relative' }}
                >
                  <style>{`
                    .prose p { margin-bottom: 1.5em !important; }
                  `}</style>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml={false}>{postProcessSectionContent(sections[currentSection].content)}</ReactMarkdown>
                </div>
                {/* References for this section */}
                {(() => {
                  const cited = getCitationsInSection(sections[currentSection].content);
                  // Only include references that exist in the extracted references mapping
                  const filteredRefs = cited.filter(num => references[num]);
                  if (filteredRefs.length === 0) return null;
                  // Sort numerically and deduplicate
                  const sortedRefs = Array.from(new Set(filteredRefs)).sort((a, b) => Number(a) - Number(b));
                  return (
                    <div className="mt-6 p-4 rounded-lg bg-muted/30 border-l-4 border-accent text-sm flex flex-col gap-1 shadow-sm">
                      <div className="flex items-center gap-2 font-semibold mb-1 text-muted-foreground">
                        <span title="References" className="text-lg">📚</span>
                        References for this section:
                      </div>
                      <ol className="ml-5">
                        {sortedRefs.map(num => (
                          <li key={num} className="mb-1 list-none">
                            <span className="font-bold mr-1">{num}.</span> {(() => {
                              const urlMatch = references[num].match(/\bhttps?:\/\/[^\s)]+/);
                              if (urlMatch) {
                                return <a href={urlMatch[0]} target="_blank" rel="noopener noreferrer" className="underline text-primary" title="Open source in new tab">{references[num]}</a>;
                              }
                              return references[num];
                            })()}
                          </li>
                        ))}
                      </ol>
                    </div>
                  );
                })()}
                <div className="flex justify-between items-center mt-4 gap-2">
                  <button
                    className="px-3 py-2 rounded bg-muted text-foreground font-semibold shadow hover:bg-muted/80 focus:ring-2 focus:ring-accent transition text-sm"
                    onClick={goToPrev}
                    disabled={currentSection === 0}
                  >
                    Previous
                  </button>
                  <button
                    className="px-4 py-2 rounded bg-accent text-accent-foreground font-semibold shadow hover:bg-accent/90 focus:ring-2 focus:ring-accent transition text-sm"
                    onClick={handleSaveToBoardPack}
                    disabled={loading || saving}
                  >
                    {saving ? (
                      <span className="flex items-center gap-2"><svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg> Saving…</span>
                    ) : saveSuccess ? (
                      <span>✔️ Saved!</span>
                    ) : (
                      'Save to Board Pack'
                    )}
                  </button>
                  <button
                    className="px-3 py-2 rounded bg-muted text-foreground font-semibold shadow hover:bg-muted/80 focus:ring-2 focus:ring-accent transition text-sm"
                    onClick={goToNext}
                    disabled={currentSection === sections.length - 1}
                  >
                    Next
                  </button>
                </div>
              </>
            ) : (
              <div className="text-base text-muted-foreground">[Competitive analysis content will appear here]</div>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>
      {/* Scenario Planning Modal */}
      <Dialog open={openScenarioModal} onClose={() => setOpenScenarioModal(false)} className="fixed z-50 inset-0 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
          <Dialog.Panel className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-2xl w-full mx-auto p-8 z-50 animate-fade-in flex flex-col">
            <button onClick={() => setOpenScenarioModal(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-primary text-xl font-bold focus:outline-none">&times;</button>
            <div className="font-bold text-xl mb-4 flex items-center gap-2">🧭 Scenario Planning: What If?</div>
            <label className="mb-2 font-semibold">Describe a scenario to analyze:</label>
            <input
              className="mb-3 px-3 py-2 rounded border border-muted-foreground/20 focus:ring-2 focus:ring-accent w-full"
              type="text"
              value={scenarioInput}
              onChange={e => setScenarioInput(e.target.value)}
              placeholder={dynamicScenarioPlaceholder}
              aria-label={`Describe a scenario to analyze for ${capitalizedCompany}`}
              disabled={scenarioLoading || dynamicLoading}
            />
            {/* Divider for clarity */}
            <hr className="my-3 border-t border-muted-foreground/20" aria-hidden="true" />
            <div className="mb-3 text-sm text-muted-foreground">Or pick a quick demo scenario:</div>
            {dynamicLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-4"><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg> Loading scenario suggestions…</div>
            ) : dynamicError ? (
              <div className="text-red-600 text-sm mb-4">{dynamicError}</div>
            ) : dynamicScenarios && dynamicScenarios.length > 0 ? (
              <div className="flex flex-col gap-2 mb-4">
                {dynamicScenarios.map((sc, idx) => (
                  <div key={idx} className="relative group flex items-center">
                    <button
                      className="px-3 py-2 rounded bg-muted text-foreground font-semibold hover:bg-muted/80 focus:ring-2 focus:ring-accent transition text-sm text-left w-full"
                      onClick={() => setScenarioInput(sc.replace(/<[^>]+>/g, ''))}
                      disabled={scenarioLoading || dynamicLoading}
                      aria-label={`Use scenario: ${sc.replace(/<[^>]+>/g, '')}`}
                      dangerouslySetInnerHTML={{ __html: sc }}
                    />
                    <span
                      tabIndex={0}
                      className="ml-2 text-muted-foreground cursor-pointer"
                      aria-label="Scenario explanation"
                      title={scenarioExplanations[idx] || 'Board-level scenario for executive planning.'}
                    >
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#e2e8f0"/><text x="12" y="16" textAnchor="middle" fontSize="12" fill="#334155" fontWeight="bold">i</text></svg>
                    </span>
                    <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-10 hidden group-hover:block group-focus-within:block bg-white border border-muted-foreground/20 rounded px-2 py-1 text-xs shadow-lg w-56"
                      role="tooltip"
                    >
                      {scenarioExplanations[idx] || 'Board-level scenario for executive planning.'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2 mb-4">
                {demoScenarios.map((sc, idx) => (
                  <div key={idx} className="relative group flex items-center">
                    <button
                      className="px-3 py-2 rounded bg-muted text-foreground font-semibold hover:bg-muted/80 focus:ring-2 focus:ring-accent transition text-sm text-left w-full"
                      onClick={() => setScenarioInput(sc.replace(/<[^>]+>/g, ''))}
                      disabled={scenarioLoading || dynamicLoading}
                      aria-label={`Use scenario: ${sc.replace(/<[^>]+>/g, '')}`}
                      dangerouslySetInnerHTML={{ __html: sc }}
                    />
                    <span
                      tabIndex={0}
                      className="ml-2 text-muted-foreground cursor-pointer"
                      aria-label="Scenario explanation"
                      title={scenarioExplanations[idx] || 'Board-level scenario for executive planning.'}
                    >
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#e2e8f0"/><text x="12" y="16" textAnchor="middle" fontSize="12" fill="#334155" fontWeight="bold">i</text></svg>
                    </span>
                    <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-10 hidden group-hover:block group-focus-within:block bg-white border border-muted-foreground/20 rounded px-2 py-1 text-xs shadow-lg w-56"
                      role="tooltip"
                    >
                      {scenarioExplanations[idx] || 'Board-level scenario for executive planning.'}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <button
              className="px-4 py-2 rounded bg-primary text-primary-foreground font-semibold shadow hover:bg-primary/90 focus:ring-2 focus:ring-accent transition text-sm mb-2"
              onClick={() => handleScenarioPlanning(scenarioInput)}
              disabled={scenarioLoading || !scenarioInput.trim()}
            >
              {scenarioLoading ? 'Generating…' : 'Generate Analysis'}
            </button>
            {scenarioError && <div className="text-red-600 mt-2">{scenarioError}</div>}
          </Dialog.Panel>
        </div>
      </Dialog>
      {/* Scenario Analysis Modal (reuses sectioned modal UI) */}
      <Dialog open={!!scenarioBrief} onClose={() => { setScenarioBrief(''); setScenarioSections([]); setScenarioReferences({}); setScenarioCurrentSection(0); }} className="fixed z-50 inset-0 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
          <Dialog.Panel className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-2xl w-full mx-auto p-8 z-50 animate-fade-in flex flex-col">
            <button onClick={() => { setScenarioBrief(''); setScenarioSections([]); setScenarioReferences({}); setScenarioCurrentSection(0); }} className="absolute top-4 right-4 text-muted-foreground hover:text-primary text-xl font-bold focus:outline-none">&times;</button>
            <div className="font-bold text-xl mb-4 flex items-center gap-2">🧭 Scenario Analysis</div>
            {scenarioLoading ? (
              <div className="text-base text-muted-foreground">Generating scenario analysis…</div>
            ) : scenarioError ? (
              <div className="text-base text-red-600">{scenarioError}</div>
            ) : scenarioSections.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-2 font-semibold text-lg">
                    <span className="text-xl align-middle">🧭</span>
                    {scenarioSections[scenarioCurrentSection].title}
                  </span>
                  <span className="ml-2 px-2 py-1 rounded-full bg-muted-foreground/10 text-xs text-muted-foreground font-medium border border-muted-foreground/20">
                    Section {scenarioCurrentSection + 1} of {scenarioSections.length}
                  </span>
                </div>
                <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-muted/30 px-6 py-4 mb-4 prose prose-lg max-w-none text-foreground" style={{lineHeight: 1.7, letterSpacing: '0.01em'}}>
                  <style>{`.prose p { margin-bottom: 1.5em !important; }`}</style>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml={false}>{postProcessSectionContent(scenarioSections[scenarioCurrentSection].content)}</ReactMarkdown>
                </div>
                {/* References for this scenario section */}
                {(() => {
                  const cited = getCitationsInSection(scenarioSections[scenarioCurrentSection].content);
                  const filteredRefs = cited.filter(num => scenarioReferences[num]);
                  if (filteredRefs.length === 0) return null;
                  const sortedRefs = Array.from(new Set(filteredRefs)).sort((a, b) => Number(a) - Number(b));
                  return (
                    <div className="mt-6 p-4 rounded-lg bg-muted/30 border-l-4 border-accent text-sm flex flex-col gap-1 shadow-sm">
                      <div className="flex items-center gap-2 font-semibold mb-1 text-muted-foreground">
                        <span title="References" className="text-lg">📚</span>
                        References for this section:
                      </div>
                      <ol className="ml-5">
                        {sortedRefs.map(num => (
                          <li key={num} className="mb-1 list-none">
                            <span className="font-bold mr-1">{num}.</span> {(() => {
                              const urlMatch = scenarioReferences[num].match(/\bhttps?:\/\/[^\s)]+/);
                              if (urlMatch) {
                                return <a href={urlMatch[0]} target="_blank" rel="noopener noreferrer" className="underline text-primary" title="Open source in new tab">{scenarioReferences[num]}</a>;
                              }
                              return scenarioReferences[num];
                            })()}
                          </li>
                        ))}
                      </ol>
                    </div>
                  );
                })()}
                <div className="flex justify-between items-center mt-4 gap-2">
                  <button
                    className="px-3 py-2 rounded bg-muted text-foreground font-semibold shadow hover:bg-muted/80 focus:ring-2 focus:ring-accent transition text-sm"
                    onClick={() => setScenarioCurrentSection(i => Math.max(0, i - 1))}
                    disabled={scenarioCurrentSection === 0}
                  >
                    Previous
                  </button>
                  <button
                    className="px-4 py-2 rounded bg-yellow-400 text-black font-semibold shadow hover:bg-yellow-300 focus:ring-2 focus:ring-accent transition text-sm"
                    onClick={handleScenarioSaveToBoardPack}
                    disabled={scenarioSaving || scenarioLoading}
                  >
                    {scenarioSaving ? (
                      <span className="flex items-center gap-2"><svg className="animate-spin h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg> Saving…</span>
                    ) : scenarioSaveSuccess ? (
                      <span>✔️ Saved!</span>
                    ) : (
                      'Save to Board Pack'
                    )}
                  </button>
                  <button
                    className="px-3 py-2 rounded bg-muted text-foreground font-semibold shadow hover:bg-muted/80 focus:ring-2 focus:ring-accent transition text-sm"
                    onClick={() => {}}
                    disabled={true}
                  >
                    Next
                  </button>
                </div>
              </>
            ) : (
              <div className="text-base text-muted-foreground">[Scenario analysis content will appear here]</div>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>
      {/* Board Pack Modal */}
      <Dialog open={openBoardPack} onClose={() => setOpenBoardPack(false)} className="fixed z-50 inset-0 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
          <Dialog.Panel className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-2xl w-full mx-auto p-8 z-50 animate-fade-in flex flex-col">
            <button onClick={() => setOpenBoardPack(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-primary text-xl font-bold focus:outline-none">&times;</button>
            <div className="font-bold text-xl mb-4 flex items-center gap-2">📁 Board Pack</div>
            {memory.length === 0 ? (
              <div className="text-base text-muted-foreground">No saved board items yet.</div>
            ) : (
              <ul className="divide-y divide-muted-foreground/10">
                {memory.map(item => (
                  <li key={item.id} className="py-3 flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{item.title}</span>
                      <span className="text-xs text-muted-foreground">{item.timestamp}</span>
                      <button
                        className="ml-auto px-2 py-1 rounded bg-muted text-foreground font-semibold hover:bg-muted/80 text-xs border border-muted-foreground/10"
                        onClick={() => setViewedBoardItem({
                          title: item.title,
                          content: (item as any).content || item.description,
                          references: (item as any).references || {},
                          timestamp: item.timestamp,
                        })}
                      >
                        View
                      </button>
                    </div>
                    <div className="truncate text-muted-foreground text-sm max-w-xl">{((item as any).content || item.description || '').slice(0, 120)}{((item as any).content || item.description || '').length > 120 ? '…' : ''}</div>
                  </li>
                ))}
              </ul>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>
      {/* Board Pack Item Detail Modal */}
      <Dialog open={!!viewedBoardItem} onClose={() => setViewedBoardItem(null)} className="fixed z-50 inset-0 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
          <Dialog.Panel className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-2xl w-full mx-auto p-8 z-50 animate-fade-in flex flex-col">
            <button onClick={() => setViewedBoardItem(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-primary text-xl font-bold focus:outline-none">&times;</button>
            {viewedBoardItem && (
              <>
                <div className="font-bold text-xl mb-2 flex items-center gap-2">{viewedBoardItem.title}</div>
                <div className="mb-4 prose prose-lg max-w-none text-foreground" style={{lineHeight: 1.7, letterSpacing: '0.01em'}}>
                  <style>{`.prose p { margin-bottom: 1.5em !important; }`}</style>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml={false}>{postProcessSectionContent(viewedBoardItem.content)}</ReactMarkdown>
                </div>
                {/* References for this saved item */}
                {viewedBoardItem.references && Object.keys(viewedBoardItem.references).length > 0 && (
                  <div className="mt-6 p-4 rounded-lg bg-muted/30 border-l-4 border-accent text-sm flex flex-col gap-1 shadow-sm">
                    <div className="flex items-center gap-2 font-semibold mb-1 text-muted-foreground">
                      <span title="References" className="text-lg">📚</span>
                      References for this section:
                    </div>
                    <ol className="ml-5">
                      {Object.keys(viewedBoardItem.references).sort((a, b) => Number(a) - Number(b)).map(num => (
                        <li key={num} className="mb-1 list-none">
                          <span className="font-bold mr-1">{num}.</span> {(() => {
                            const urlMatch = viewedBoardItem.references[num].match(/\bhttps?:\/\/[^\s)]+/);
                            if (urlMatch) {
                              return <a href={urlMatch[0]} target="_blank" rel="noopener noreferrer" className="underline text-primary" title="Open source in new tab">{viewedBoardItem.references[num]}</a>;
                            }
                            return viewedBoardItem.references[num];
                          })()}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>
      {/* Benchmark Modal */}
      <Dialog open={openBenchmarkModal} onClose={() => setOpenBenchmarkModal(false)} className="fixed z-50 inset-0 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
          <BenchmarkBoard onClose={() => setOpenBenchmarkModal(false)} />
        </div>
      </Dialog>
    </div>
  );
} 