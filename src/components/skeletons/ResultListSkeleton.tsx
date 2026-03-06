/**
 * ResultListSkeleton - Loading skeleton for ResultList component
 * Displayed while ResultList is being lazy-loaded
 * v0.23.0: Added shimmer effect for better UX
 */

export function ResultListSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="h-32 rounded-lg overflow-hidden relative"
          style={{ background: 'var(--bg-surface-muted)' }}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
      ))}
    </div>
  );
}
