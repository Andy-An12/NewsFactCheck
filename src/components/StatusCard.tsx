type Props = {
    status: string;
    progress: number;
};

const STATUS_LABELS: Record<string, string> = {
    idle: 'Waiting for a file',
    running: 'Starting…',
    uploaded: 'File uploaded',
    transcribing: 'Transcribing audio…',
    analyzing: 'Fact-checking claims with web search…',
    completed: 'Done — verdicts below',
    failed: 'Analysis failed',
};

export default function StatusCard({ status, progress }: Props) {
    return (
        <article style={styles.card}>
            <h2 style={styles.cardTitle}>Status</h2>
            <p style={styles.statusLabel}>{STATUS_LABELS[status] ?? status}</p>
            <div style={styles.progressTrack}><div style={{ ...styles.progressFill, width: `${progress}%` }} /></div>
            <p style={styles.note}>Example: search for “inflation” — every moment the speaker says “inflation” is listed, and each statement made there is checked as verified, false, or needs review.</p>
        </article>
    );
}

const styles = {
    card: { background: '#121a29', border: '1px solid #22304d', borderRadius: 18, padding: 18 },
    cardTitle: { fontSize: 18, marginBottom: 10 },
    statusLabel: { color: '#bfdbfe', marginBottom: 8 },
    progressTrack: { height: 8, background: '#182334', borderRadius: 999, overflow: 'hidden' },
    progressFill: { height: '100%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' },
    note: { color: '#cbd5e1', fontSize: 13, marginTop: 8 },
} as const;
