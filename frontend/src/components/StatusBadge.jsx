const styles = {
  pending: 'bg-amber-50 text-amber-600',
  confirmed: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-600',
};

export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || ''}`}
    >
      {status}
    </span>
  );
}
