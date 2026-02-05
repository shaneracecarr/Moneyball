"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";

interface CopyInviteCodeProps {
  code: string;
}

export function CopyInviteCode({ code }: CopyInviteCodeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 rounded-lg bg-[#1a1d24] border border-gray-700 px-3 py-2 text-lg font-mono font-semibold tracking-wider text-white">
        {code}
      </code>
      <Button
        onClick={handleCopy}
        variant="outline"
        size="sm"
        className="gap-2 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white bg-transparent"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4 text-green-400" />
            <span className="text-green-400">Copied!</span>
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" />
            Copy
          </>
        )}
      </Button>
    </div>
  );
}
