interface ActivityItem {
  id: string;
  leagueId: string;
  type: "trade_completed" | "free_agent_pickup" | "waiver_claim" | "player_dropped";
  payload: string;
  createdAt: Date;
}

interface ActivityFeedProps {
  activity: ActivityItem[];
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

function ActivityItemDisplay({ item }: { item: ActivityItem }) {
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(item.payload);
  } catch {
    // Ignore parse errors
  }

  if (item.type === "trade_completed") {
    const teams = (payload.teams as string) || "Unknown teams";
    const playerCount = (payload.playerCount as number) || 0;
    return (
      <div className="flex items-start gap-3 py-3 border-b border-gray-700/50 last:border-b-0">
        <div className="flex-shrink-0 w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white">
            <span className="font-medium">Trade completed</span> between {teams}
          </p>
          <p className="text-xs text-gray-400">
            {playerCount} player{playerCount !== 1 ? "s" : ""} exchanged
          </p>
        </div>
        <span className="text-xs text-gray-500 flex-shrink-0">
          {formatRelativeTime(item.createdAt)}
        </span>
      </div>
    );
  }

  if (item.type === "free_agent_pickup") {
    const playerName = (payload.playerName as string) || "Unknown player";
    const playerPosition = (payload.playerPosition as string) || "";
    const teamName = (payload.teamName as string) || "A team";
    return (
      <div className="flex items-start gap-3 py-3 border-b border-gray-700/50 last:border-b-0">
        <div className="flex-shrink-0 w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white">
            <span className="font-medium">{teamName}</span> signed{" "}
            <span className="font-medium">{playerName}</span>
            {playerPosition && (
              <span className="ml-1 text-xs text-gray-400">({playerPosition})</span>
            )}
          </p>
          <p className="text-xs text-gray-400">Free agent pickup</p>
        </div>
        <span className="text-xs text-gray-500 flex-shrink-0">
          {formatRelativeTime(item.createdAt)}
        </span>
      </div>
    );
  }

  if (item.type === "waiver_claim") {
    const playerName = (payload.playerName as string) || "Unknown player";
    const playerPosition = (payload.playerPosition as string) || "";
    const teamName = (payload.teamName as string) || "A team";
    const bidAmount = payload.bidAmount as number | undefined;
    return (
      <div className="flex items-start gap-3 py-3 border-b border-gray-700/50 last:border-b-0">
        <div className="flex-shrink-0 w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white">
            <span className="font-medium">{teamName}</span> claimed{" "}
            <span className="font-medium">{playerName}</span>
            {playerPosition && (
              <span className="ml-1 text-xs text-gray-400">({playerPosition})</span>
            )}
          </p>
          <p className="text-xs text-gray-400">
            Waiver claim{bidAmount !== undefined ? ` ($${bidAmount})` : ""}
          </p>
        </div>
        <span className="text-xs text-gray-500 flex-shrink-0">
          {formatRelativeTime(item.createdAt)}
        </span>
      </div>
    );
  }

  if (item.type === "player_dropped") {
    const playerName = (payload.playerName as string) || "Unknown player";
    const playerPosition = (payload.playerPosition as string) || "";
    const teamName = (payload.teamName as string) || "A team";
    return (
      <div className="flex items-start gap-3 py-3 border-b border-gray-700/50 last:border-b-0">
        <div className="flex-shrink-0 w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white">
            <span className="font-medium">{teamName}</span> dropped{" "}
            <span className="font-medium">{playerName}</span>
            {playerPosition && (
              <span className="ml-1 text-xs text-gray-400">({playerPosition})</span>
            )}
          </p>
          <p className="text-xs text-gray-400">Player released to waivers</p>
        </div>
        <span className="text-xs text-gray-500 flex-shrink-0">
          {formatRelativeTime(item.createdAt)}
        </span>
      </div>
    );
  }

  return null;
}

export function ActivityFeed({ activity }: ActivityFeedProps) {
  if (activity.length === 0) {
    return (
      <div className="bg-[#252830] rounded-xl border border-gray-700 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
          <p className="text-sm text-gray-400 mt-1">League transactions and updates</p>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-gray-400 text-center py-4">
            No recent activity yet. Trades and free agent pickups will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#252830] rounded-xl border border-gray-700 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
        <p className="text-sm text-gray-400 mt-1">League transactions and updates</p>
      </div>
      <div className="px-6 py-4">
        {activity.map((item) => (
          <ActivityItemDisplay key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
