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

type Props = {
    keyword: string;
    evidence: EvidenceItem[];
    factChecks: FactCheckItem[];
};

export default function ResultsPanel({ keyword, evidence, factChecks }: Props) {
    return (
        <section style={styles.card}>
            <h2 style={styles.cardTitle}>Analysis results</h2>
            <p style={styles.muted}>Keyword: {keyword}</p>

            <h3 style={styles.sectionTitle}>Matched evidence</h3>
            {evidence.length ? evidence.map((item, i) => (
                <article key={i} style={styles.resultBox}>
                    <strong>{item.start_sec.toFixed(1)}s – {item.end_sec.toFixed(1)}s</strong>
                    <p style={styles.quote}>“{item.quote}”</p>
                    <p style={styles.muted}>Matched keyword: {item.matched_keyword}</p>
                </article>
            )) : <p style={styles.muted}>No keyword matches were found in this content.</p>}

            <h3 style={styles.sectionTitle}>AI fact-check</h3>
            {factChecks.length ? factChecks.map((item, i) => (
                <article key={i} style={styles.resultBox}>
                    <div style={styles.factHeader}>
                        <strong>{item.claim}</strong>
                        <span style={styles.pill}>{item.verdict} · {Math.round(item.confidence * 100)}%</span>
                    </div>
                    <p style={styles.note}>{item.summary}</p>
                    {item.evidence.map((ev, j) => (
                        <p key={j} style={styles.quote}>[{ev.start_sec.toFixed(1)}s – {ev.end_sec.toFixed(1)}s] {ev.quote}</p>
                    ))}
                </article>
            )) : <p style={styles.muted}>AI fact-check is unavailable without an ANTHROPIC_API_KEY.</p>}
        </section>
    );
}

const styles = {
    card: { background: '#121a29', border: '1px solid #22304d', borderRadius: 18, padding: 18 },
    cardTitle: { fontSize: 18, marginBottom: 10 },
    sectionTitle: { fontSize: 16, marginTop: 14, marginBottom: 8 },
    resultBox: { background: '#0b1220', border: '1px solid #22304d', borderRadius: 14, padding: 12, marginBottom: 10 },
    quote: { color: '#e5eefb', fontSize: 13, marginTop: 6, lineHeight: 1.5 },
    note: { color: '#cbd5e1', fontSize: 13, marginTop: 8 },
    muted: { color: '#cbd5e1', fontSize: 13 },
    factHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' },
    pill: { background: '#172235', borderRadius: 999, padding: '4px 8px', color: '#c4b5fd', fontSize: 12 },
} as const;
