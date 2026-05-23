export function Skeleton({ width = '100%', height = 16, radius = 10, style = {} }) {
  return (
    <div
      className="sca-skeleton"
      style={{ width, height, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="sca-stat-card">
      <Skeleton height={12} width="55%" />
      <Skeleton height={32} width="40%" style={{ marginTop: 10 }} />
      <Skeleton height={10} width="70%" style={{ marginTop: 8 }} />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div style={{ padding: 28 }}>
      <Skeleton height={120} radius={20} style={{ marginBottom: 24 }} />
      <div className="sca-grid-4" style={{ marginBottom: 24 }}>
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <div className="sca-grid-2">
        <div className="sca-card"><Skeleton height={18} width="35%" style={{ marginBottom: 16 }} /><Skeleton height={64} /><Skeleton height={64} style={{ marginTop: 12 }} /></div>
        <div className="sca-card"><Skeleton height={18} width="40%" style={{ marginBottom: 16 }} /><Skeleton height={48} /><Skeleton height={48} style={{ marginTop: 12 }} /></div>
      </div>
    </div>
  );
}
