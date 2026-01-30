import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ActivityItem {
  id: string;
  leagueId: string;
  type: "trade_completed" | "free_agent_pickup";
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
      <div className="flex items-start gap-3 py-3 border-b last:border-b-0">
        <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900">
            <span className="font-medium">Trade completed</span> between {teams}
          </p>
          <p className="text-xs text-gray-500">
            {playerCount} player{playerCount !== 1 ? "s" : ""} exchanged
          </p>
        </div>
        <span className="text-xs text-gray-400 flex-shrink-0">
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
      <div className="flex items-start gap-3 py-3 border-b last:border-b-0">
        <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900">
            <span className="font-medium">{teamName}</span> signed{" "}
            <span className="font-medium">{playerName}</span>
            {playerPosition && (
              <span className="ml-1 text-xs text-gray-500">({playerPosition})</span>
            )}
          </p>
          <p className="text-xs text-gray-500">Free agent pickup</p>
        </div>
        <span className="text-xs text-gray-400 flex-shrink-0">
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
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>League transactions and updates</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 text-center py-4">
            No recent activity yet. Trades and free agent pickups will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>League transactions and updates</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y divide-gray-100">
          {activity.map((item) => (
            <ActivityItemDisplay key={item.id} item={item} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
