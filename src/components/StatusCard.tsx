type Props = {
    status: string;
    progress: number;
};

export default function StatusCard({ status, progress }: Props) {
    return (
        <article style={styles.card}>
            <h2 style={styles.cardTitle}>Status</h2>
            <p style={styles.statusLabel}>{status}</p>
            <div style={styles.progressTrack}><div style={{ ...styles.progressFill, width: `${progress}%` }} /></div>
            <p style={styles.note}>Example: “U.S.-Iran war background and related context”</p>
        </article>
    );
}

const styles = {
    card: { background: '#121a29', border: '1px solid #22304d', borderRadius: 18, padding: 18 },
    cardTitle: { fontSize: 18, marginBottom: 10 },
    statusLabel: { textTransform: 'capitalize', color: '#bfdbfe', marginBottom: 8 },
    progressTrack: { height: 8, background: '#182334', borderRadius: 999, overflow: 'hidden' },
    progressFill: { height: '100%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' },
    note: { color: '#cbd5e1', fontSize: 13, marginTop: 8 },
} as const;
