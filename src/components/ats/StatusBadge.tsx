interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const statusStyles: Record<string, string> = {
    new: 'bg-blue-50 text-blue-700 border-blue-200',
    applied: 'bg-blue-50 text-blue-700 border-blue-200',
    screening: 'bg-purple-50 text-purple-700 border-purple-200',
    longlisted: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    shortlisted: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    interview: 'bg-amber-50 text-amber-700 border-amber-200',
    'technical-test': 'bg-orange-50 text-orange-700 border-orange-200',
    offer: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    hired: 'bg-green-50 text-green-700 border-green-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    withdrawn: 'bg-gray-50 text-gray-700 border-gray-200',
    pending: 'bg-gray-50 text-gray-700 border-gray-200',
    active: 'bg-green-50 text-green-700 border-green-200',
    closed: 'bg-gray-50 text-gray-700 border-gray-200',
    draft: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    approved: 'bg-green-50 text-green-700 border-green-200',
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${sizeClasses} ${
        statusStyles[status.toLowerCase()] || statusStyles.pending
      }`}
    >
      {status}
    </span>
  );
}

