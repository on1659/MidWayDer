/**
 * ResultListSkeleton - Loading skeleton for ResultList component
 * Displayed while ResultList is being lazy-loaded
 */

export function ResultListSkeleton() {
  return (
    <div className="animate-pulse space-y-3 p-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="h-32 rounded-lg"
          style={{ background: 'var(--bg-surface-muted)' }}
        />
      ))}
    </div>
  );
}
