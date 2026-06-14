type Props = {
    keyword: string;
    onKeywordChange: (value: string) => void;
    onFileSelect: (file: File | null) => void;
    onAnalyze: () => void;
};

export default function AnalysisForm({ keyword, onKeywordChange, onFileSelect, onAnalyze }: Props) {
    return (
        <article style={styles.card}>
            <h2 style={styles.cardTitle}>1. Upload content</h2>
            <input type="file" accept="audio/*,video/*" onChange={(e) => onFileSelect(e.target.files?.[0] ?? null)} style={styles.input} />

            <h2 style={styles.cardTitle}>2. Search keyword</h2>
            <textarea rows={5} value={keyword} onChange={(e) => onKeywordChange(e.target.value)} style={styles.textarea} />

            <button onClick={onAnalyze} style={styles.button}>Start analysis</button>
        </article>
    );
}

const styles = {
    card: { background: '#121a29', border: '1px solid #22304d', borderRadius: 18, padding: 18 },
    cardTitle: { fontSize: 18, marginBottom: 10 },
    input: { width: '100%', background: '#0b1220', color: '#eef4ff', border: '1px solid #27344d', borderRadius: 10, padding: 10, marginBottom: 12 },
    textarea: { width: '100%', background: '#0b1220', color: '#eef4ff', border: '1px solid #27344d', borderRadius: 10, padding: 10 },
    button: { marginTop: 12, width: '100%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', color: '#fff', borderRadius: 10, padding: '10px 12px', fontWeight: 700, cursor: 'pointer' },
} as const;
