import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
}

/** Basic skeleton block with shimmer animation */
export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height = 16,
  borderRadius,
}) => (
  <div
    className={`grx-skeleton ${className}`}
    style={{
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
      borderRadius,
    }}
    aria-hidden="true"
  />
);

/** Skeleton for a metric/stat card */
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`bg-white dark:bg-grx-dark-surface p-5 rounded-xl border border-slate-100 dark:border-grx-dark-surface ${className}`}
  >
    <div className="flex justify-between items-start mb-3">
      <div className="space-y-2 flex-1">
        <Skeleton width="60%" height={14} />
        <Skeleton width="40%" height={28} />
      </div>
      <Skeleton width={40} height={40} borderRadius="8px" />
    </div>
    <Skeleton width="50%" height={12} />
  </div>
);

/** Skeleton for a table row */
export const SkeletonTableRow: React.FC<{ columns?: number }> = ({ columns = 5 }) => (
  <tr>
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="px-6 py-4">
        <Skeleton
          width={i === 0 ? '70%' : i === columns - 1 ? 40 : '50%'}
          height={14}
        />
        {i === 0 && <Skeleton width="40%" height={12} className="mt-2" />}
      </td>
    ))}
  </tr>
);

/** Skeleton for a dashboard grid */
export const SkeletonDashboard: React.FC = () => (
  <div className="space-y-6 grx-animate-fade-in">
    {/* Header area */}
    <div className="flex justify-between items-end">
      <div className="space-y-2">
        <Skeleton width={280} height={32} />
        <Skeleton width={200} height={16} />
      </div>
      <Skeleton width={160} height={16} />
    </div>

    {/* Metric cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 grx-stagger">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>

    {/* Secondary metrics */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 grx-stagger">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>

    {/* Content area */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white dark:bg-grx-dark-surface p-6 rounded-xl border border-slate-100 dark:border-grx-dark-surface">
        <Skeleton width="40%" height={20} className="mb-4" />
        <div className="space-y-3">
          <Skeleton height={48} />
          <Skeleton height={48} />
          <Skeleton height={48} />
        </div>
      </div>
      <div className="bg-white dark:bg-grx-dark-surface p-6 rounded-xl border border-slate-100 dark:border-grx-dark-surface">
        <Skeleton width="40%" height={20} className="mb-4" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton height={80} />
          <Skeleton height={80} />
          <Skeleton height={80} />
          <Skeleton height={80} />
        </div>
      </div>
    </div>
  </div>
);

/** Skeleton for a table */
export const SkeletonTable: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 5,
}) => (
  <div className="bg-white dark:bg-grx-dark-surface rounded-xl border border-slate-100 dark:border-grx-dark-surface overflow-hidden grx-animate-fade-in">
    {/* Table header skeleton */}
    <div className="bg-grx-primary-50 dark:bg-grx-primary-900 px-6 py-3 flex gap-8">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} width={`${80 + Math.random() * 40}px`} height={12} />
      ))}
    </div>
    {/* Table body skeleton */}
    <table className="min-w-full">
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonTableRow key={i} columns={columns} />
        ))}
      </tbody>
    </table>
  </div>
);
