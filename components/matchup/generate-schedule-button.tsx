"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateScheduleAction } from "@/lib/actions/matchups";
import { Button } from "@/components/ui/button";

interface GenerateScheduleButtonProps {
  leagueId: string;
}

export function GenerateScheduleButton({ leagueId }: GenerateScheduleButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleGenerate = () => {
    setError(null);
    startTransition(async () => {
      const result = await generateScheduleAction(leagueId);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div>
      <Button onClick={handleGenerate} disabled={isPending} variant="default" size="sm">
        {isPending ? "Generating..." : "Generate Schedule"}
      </Button>
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}
