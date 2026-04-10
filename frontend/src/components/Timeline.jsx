export default function Timeline({ items }) {
  if (!items || items.length === 0) {
    return <p className="text-xs text-gray-400">No activity yet</p>;
  }

  return (
    <div className="space-y-0">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        const dotColor =
          item.status === 'confirmed'
            ? 'bg-green-500'
            : item.status === 'rejected'
              ? 'bg-red-500'
              : 'bg-amber-400';

        return (
          <div key={item.id || i} className="grid grid-cols-[80px_1px_1fr] gap-3">
            {/* Date column — right-aligned */}
            <div className="text-xs text-gray-400 text-right pt-0.5">
              {item.date}
            </div>

            {/* Line column — dot + connector */}
            <div className="flex flex-col items-center">
              <div className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
              {!isLast && (
                <div className="w-px flex-1 min-h-6 bg-gray-200 mt-1" />
              )}
            </div>

            {/* Content column */}
            <div className="pb-4">
              <p className="text-xs font-medium text-gray-900">{item.title}</p>
              {item.detail && (
                <p className="text-xs text-gray-400 mt-0.5">{item.detail}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
