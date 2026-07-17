type Props = {
    keyword: string;
    onKeywordChange: (value: string) => void;
    apiKey: string;
    onApiKeyChange: (value: string) => void;
    onFileSelect: (file: File | null) => void;
    onAnalyze: () => void;
};

export default function AnalysisForm({ keyword, onKeywordChange, apiKey, onApiKeyChange, onFileSelect, onAnalyze }: Props) {
    return (
        <article style={styles.card}>
            <h2 style={styles.cardTitle}>1. Your Anthropic API key</h2>
            <input
                type="password"
                value={apiKey}
                onChange={(e) => onApiKeyChange(e.target.value)}
                placeholder="sk-ant-..."
                autoComplete="off"
                style={styles.input}
            />
            <p style={styles.hint}>Used once to call Claude for this analysis. Never stored — cleared when you leave the page.</p>

            <h2 style={styles.cardTitle}>2. Upload video or audio</h2>
            <input type="file" accept="audio/*,video/*" onChange={(e) => onFileSelect(e.target.files?.[0] ?? null)} style={styles.input} />

            <h2 style={styles.cardTitle}>3. Keyword to search for</h2>
            <textarea rows={2} value={keyword} onChange={(e) => onKeywordChange(e.target.value)} placeholder='A word or short phrase spoken in the content, e.g. "inflation"' style={styles.textarea} />
            <p style={styles.hint}>We find every segment where this keyword is spoken, then fact-check the statements made in those segments.</p>

            <button onClick={onAnalyze} style={styles.button}>Find & fact-check</button>
        </article>
    );
}

const styles = {
    card: { background: '#121a29', border: '1px solid #22304d', borderRadius: 18, padding: 18 },
    cardTitle: { fontSize: 18, marginBottom: 10 },
    input: { width: '100%', background: '#0b1220', color: '#eef4ff', border: '1px solid #27344d', borderRadius: 10, padding: 10, marginBottom: 4 },
    textarea: { width: '100%', background: '#0b1220', color: '#eef4ff', border: '1px solid #27344d', borderRadius: 10, padding: 10 },
    hint: { color: '#8ea3c4', fontSize: 12, marginBottom: 14, marginTop: 2 },
    button: { marginTop: 12, width: '100%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', color: '#fff', borderRadius: 10, padding: '10px 12px', fontWeight: 700, cursor: 'pointer' },
} as const;
