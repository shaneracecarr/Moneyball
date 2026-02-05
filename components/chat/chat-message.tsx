"use client";

import { PlayerNameLink } from "@/components/player-card/player-name-link";

interface Message {
  id: string;
  leagueId: string;
  type: "user" | "system";
  userId: string | null;
  memberId: string | null;
  text: string;
  metadata: string | null;
  createdAt: Date;
  teamName: string | null;
  userName: string | null;
  userEmail: string | null;
}

interface ChatMessageProps {
  message: Message;
  isCurrentUser: boolean;
}

function formatTime(date: Date): string {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(date: Date): string {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) {
    return "Today";
  } else if (d.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }
  return d.toLocaleDateString();
}

// Parse metadata and render player links for system messages
function SystemMessageContent({ text, metadata }: { text: string; metadata: string | null }) {
  if (!metadata) {
    return <span>{text}</span>;
  }

  try {
    const data = JSON.parse(metadata);

    if (data.type === "free_agent_pickup" && data.playerId && data.playerName) {
      // Render: "TeamName picked up PlayerName (FA)"
      const teamName = data.teamName || "A team";
      return (
        <span>
          <span className="font-semibold text-purple-400">{teamName}</span>
          {" picked up "}
          <PlayerNameLink playerId={data.playerId} playerName={data.playerName} className="font-semibold text-white hover:text-purple-300" />
          <span className="text-gray-500"> (FA)</span>
        </span>
      );
    }

    if (data.type === "trade_completed" && data.items) {
      // For trades, show team names and players involved
      const teams = data.teams || [];
      return (
        <span>
          <span className="font-semibold text-green-400">Trade completed</span>
          {teams.length >= 2 && (
            <>
              {" between "}
              <span className="font-semibold text-purple-400">{teams[0]}</span>
              {" and "}
              <span className="font-semibold text-purple-400">{teams[1]}</span>
            </>
          )}
          {": "}
          {data.items.map((item: { playerId: string; playerName: string; fromTeam?: string; toTeam?: string }, index: number) => (
            <span key={item.playerId}>
              {index > 0 && ", "}
              <PlayerNameLink playerId={item.playerId} playerName={item.playerName} className="font-semibold text-white hover:text-purple-300" />
              {item.fromTeam && item.toTeam && (
                <span className="text-gray-500 text-xs"> ({item.fromTeam} → {item.toTeam})</span>
              )}
            </span>
          ))}
        </span>
      );
    }

    return <span>{text}</span>;
  } catch {
    return <span>{text}</span>;
  }
}

export function ChatMessage({ message, isCurrentUser }: ChatMessageProps) {
  const isSystem = message.type === "system";

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="bg-[#1a1d24] border border-gray-700 text-gray-300 text-sm px-4 py-2 rounded-lg max-w-[90%]">
          <SystemMessageContent text={message.text} metadata={message.metadata} />
          <span className="ml-2 text-xs text-gray-500">
            {formatTime(message.createdAt)}
          </span>
        </div>
      </div>
    );
  }

  const authorName = message.teamName || message.userName || message.userEmail || "Unknown";

  return (
    <div className={`flex flex-col ${isCurrentUser ? "items-end" : "items-start"}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xs font-medium ${isCurrentUser ? "text-purple-400" : "text-gray-400"}`}>
          {authorName}
        </span>
        <span className="text-xs text-gray-500">
          {formatDate(message.createdAt)} {formatTime(message.createdAt)}
        </span>
      </div>
      <div
        className={`max-w-[80%] px-4 py-2 rounded-2xl ${
          isCurrentUser
            ? "bg-purple-600 text-white rounded-br-md"
            : "bg-[#1e2128] text-gray-200 rounded-bl-md"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
      </div>
    </div>
  );
}
