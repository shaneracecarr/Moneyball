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
      // Replace player name in text with clickable link
      const parts = text.split(data.playerName);
      return (
        <span>
          {parts[0]}
          <PlayerNameLink playerId={data.playerId} playerName={data.playerName} className="font-medium" />
          {parts[1]}
        </span>
      );
    }

    if (data.type === "trade_completed" && data.items) {
      // For trades, we need to handle multiple players
      // The text format is: "Trade completed: Player1 (Team1 → Team2), Player2 (Team3 → Team4)"
      // We'll render it differently
      return (
        <span>
          Trade completed:{" "}
          {data.items.map((item: { playerId: string; playerName: string; fromMemberId: string; toMemberId: string }, index: number) => (
            <span key={item.playerId}>
              {index > 0 && ", "}
              <PlayerNameLink playerId={item.playerId} playerName={item.playerName} className="font-medium" />
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
        <div className="bg-gray-100 text-gray-600 text-sm px-4 py-2 rounded-full max-w-[90%]">
          <SystemMessageContent text={message.text} metadata={message.metadata} />
          <span className="ml-2 text-xs text-gray-400">
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
        <span className={`text-xs font-medium ${isCurrentUser ? "text-indigo-600" : "text-gray-600"}`}>
          {authorName}
        </span>
        <span className="text-xs text-gray-400">
          {formatDate(message.createdAt)} {formatTime(message.createdAt)}
        </span>
      </div>
      <div
        className={`max-w-[80%] px-4 py-2 rounded-2xl ${
          isCurrentUser
            ? "bg-indigo-600 text-white rounded-br-md"
            : "bg-gray-100 text-gray-900 rounded-bl-md"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
      </div>
    </div>
  );
}
