export default function BalanceBar({ totalOwed, totalConfirmed, nextDue }) {
  const pct = totalOwed > 0 ? Math.min((totalConfirmed / totalOwed) * 100, 100) : 0;

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white">
      <div className="flex justify-between mb-2">
        <span className="text-xs text-gray-400">Payment progress</span>
        <span className="text-xs text-gray-400">{pct.toFixed(1)}% complete</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full">
        <div
          className="h-2 bg-green-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-xs text-gray-400">£0</span>
        {nextDue && (
          <span className="text-xs text-gray-400">
            Next due: {nextDue.due_date} &middot; £{nextDue.amount.toFixed(2)}
          </span>
        )}
        <span className="text-xs text-gray-400">£{totalOwed.toFixed(2)}</span>
      </div>
    </div>
  );
}
