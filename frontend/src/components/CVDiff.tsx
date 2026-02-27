import diff_match_patch from 'diff-match-patch';

interface Props {
    oldText: string;
    newText: string;
}

export default function CVDiff({ oldText, newText }: Props) {
    // Use the diff-match-patch library to compute the differences
    const dmp = new diff_match_patch();
    const diffs = dmp.diff_main(oldText || "", newText || "");

    // Cleanup the semantics to make the diff more human readable
    dmp.diff_cleanupSemantic(diffs);

    return (
        <div className="cv-diff-viewer" style={{ fontFamily: 'monospace', fontSize: '0.85rem', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
            {diffs.map((part, index) => {
                // diff_match_patch returns arrays where:
                // part[0] is the operation: -1 (delete), 1 (insert), 0 (equal)
                // part[1] is the text string

                const operation = part[0];
                const text = part[1];

                // Green background for additions
                if (operation === 1) {
                    return (
                        <span key={index} style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', color: 'var(--accent-green)', padding: '0 2px', borderRadius: '2px' }}>
                            {text}
                        </span>
                    );
                }

                // Red background with strikethrough for deletions
                if (operation === -1) {
                    return (
                        <del key={index} style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: 'var(--accent-red)', padding: '0 2px', borderRadius: '2px', textDecoration: 'line-through' }}>
                            {text}
                        </del>
                    );
                }

                // Normal text for unchanged parts
                return <span key={index} style={{ color: 'var(--text-secondary)' }}>{text}</span>;
            })}
        </div>
    );
}
