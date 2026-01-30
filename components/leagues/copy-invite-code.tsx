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
      <code className="flex-1 rounded bg-gray-100 px-3 py-2 text-lg font-mono font-semibold tracking-wider">
        {code}
      </code>
      <Button
        onClick={handleCopy}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4" />
            Copied!
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
