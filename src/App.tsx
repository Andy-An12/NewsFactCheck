import { useEffect, useMemo, useState } from 'react';
import AnalysisForm from './components/AnalysisForm';
import ResultsPanel from './components/ResultsPanel';
import StatusCard from './components/StatusCard';

const API = '/api';

type EvidenceItem = {
    start_sec: number;
    end_sec: number;
    quote: string;
    matched_keyword: string;
};

type FactCheckItem = {
    claim: string;
    verdict: string;
    confidence: number;
    summary: string;
    evidence: EvidenceItem[];
};

type ResultResponse = {
    job_id: string;
    keyword: string;
    evidence: EvidenceItem[];
    fact_checks: FactCheckItem[];
};

export default function App() {
    const [keyword, setKeyword] = useState('inflation');
    const [apiKey, setApiKey] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [jobId, setJobId] = useState('');
    const [status, setStatus] = useState('idle');
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<ResultResponse | null>(null);

    const analyze = async () => {
        if (!file) {
            alert('Please choose an audio or video file first.');
            return;
        }
        if (!apiKey.trim()) {
            alert('Please enter your Anthropic API key.');
            return;
        }

        const form = new FormData();
        form.append('file', file);
        form.append('keyword', keyword);
        form.append('api_key', apiKey.trim());

        const res = await fetch(`${API}/analyze`, { method: 'POST', body: form });
        const data = await res.json();

        if (!res.ok) {
            alert(data.detail || 'Analysis failed.');
            return;
        }

        setJobId(data.job_id);
        setStatus('running');
        setProgress(0);
        setResult(null);
    };

    useEffect(() => {
        if (!jobId) return;

        const timer = setInterval(async () => {
            const res = await fetch(`${API}/job/${jobId}`);
            const data = await res.json();
            setStatus(data.status);
            setProgress(data.progress || 0);

            if (data.status === 'completed') {
                clearInterval(timer);
                const resultRes = await fetch(`${API}/job/${jobId}/result`);
                const resultData: ResultResponse = await resultRes.json();
                setResult(resultData);
            }
        }, 1500);

        return () => clearInterval(timer);
    }, [jobId]);

    const confidenceLabel = useMemo(() => {
        if (!result) return 'Ready to analyze';
        return result.fact_checks.length ? 'Verdicts ready' : 'Keyword matches found';
    }, [result]);

    return (
        <main style={styles.page}>
            <section style={styles.hero}>
                <div>
                    <p style={styles.eyebrow}>NewsFactCheck</p>
                    <h1 style={styles.title}>Find every moment a keyword is spoken — and check if it’s true.</h1>
                    <p style={styles.subtitle}>Upload a video or audio file and enter a keyword. We locate each segment where the keyword is spoken, then fact-check what the speaker said there against the web — because spoken content sometimes gets the facts wrong.</p>
                </div>
                <div style={styles.badge}>{confidenceLabel}</div>
            </section>

            <section style={styles.grid}>
                <AnalysisForm
                    keyword={keyword}
                    onKeywordChange={setKeyword}
                    apiKey={apiKey}
                    onApiKeyChange={setApiKey}
                    onFileSelect={setFile}
                    onAnalyze={analyze}
                />

                <StatusCard status={status} progress={progress} />
            </section>

            {result && (
                <ResultsPanel
                    keyword={result.keyword}
                    evidence={result.evidence}
                    factChecks={result.fact_checks}
                />
            )}
        </main>
    );
}

const styles: Record<string, React.CSSProperties> = {
    page: { minHeight: '100vh', background: 'linear-gradient(180deg, #07111f 0%, #0b1220 100%)', color: '#eef4ff', padding: 24 },
    hero: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 18 },
    eyebrow: { textTransform: 'uppercase', letterSpacing: '0.2em', color: '#c4b5fd', fontSize: 12 },
    title: { fontSize: 32, lineHeight: 1.2, marginTop: 8, marginBottom: 8 },
    subtitle: { color: '#bfdbfe', maxWidth: 640 },
    badge: { background: '#172235', border: '1px solid #27344d', borderRadius: 999, padding: '8px 12px', color: '#c4b5fd', fontSize: 13 },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 },
    card: { background: '#121a29', border: '1px solid #22304d', borderRadius: 18, padding: 18 },
    cardTitle: { fontSize: 18, marginBottom: 10 },
    note: { color: '#cbd5e1', fontSize: 13, marginTop: 8 },
    muted: { color: '#cbd5e1', fontSize: 13 },
};
