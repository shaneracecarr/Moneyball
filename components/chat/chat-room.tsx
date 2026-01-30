"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getChatMessagesAction, postChatMessageAction } from "@/lib/actions/chat";
import { ChatMessage } from "./chat-message";

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

interface ChatRoomProps {
  leagueId: string;
  currentMemberId: string;
  currentTeamName: string;
  initialMessages: Message[];
}

export function ChatRoom({
  leagueId,
  currentMemberId,
  currentTeamName,
  initialMessages,
}: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Polling for new messages every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      const result = await getChatMessagesAction(leagueId);
      if (result.messages) {
        setMessages(result.messages);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [leagueId]);

  async function handleSend() {
    if (!inputValue.trim() || isPending) return;

    setError(null);
    const text = inputValue;
    setInputValue("");

    startTransition(async () => {
      const result = await postChatMessageAction(leagueId, text);
      if (result.error) {
        setError(result.error);
        setInputValue(text); // Restore input on error
      } else {
        // Refresh messages after sending
        const messagesResult = await getChatMessagesAction(leagueId);
        if (messagesResult.messages) {
          setMessages(messagesResult.messages);
        }
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function handleRefresh() {
    const result = await getChatMessagesAction(leagueId);
    if (result.messages) {
      setMessages(result.messages);
    }
  }

  return (
    <Card className="flex flex-col h-[600px]">
      <CardContent className="flex flex-col h-full p-4">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-3 pr-2">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                isCurrentUser={message.memberId === currentMemberId}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </div>
        )}

        {/* Input area */}
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            maxLength={500}
            disabled={isPending}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || isPending}
          >
            {isPending ? "Sending..." : "Send"}
          </Button>
          <Button variant="outline" onClick={handleRefresh} title="Refresh messages">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
