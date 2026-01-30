"use client";

import { useState } from "react";
import { joinLeagueByCodeAction } from "@/lib/actions/leagues";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function JoinLeaguePage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError(null);

    const result = await joinLeagueByCodeAction(formData);

    if (result.error) {
      setError(result.error);
      setIsLoading(false);
    } else if (result.success && result.leagueId) {
      // Redirect to the league page
      router.push(`/leagues/${result.leagueId}`);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Join a League</CardTitle>
          <CardDescription>
            Enter the invite code you received to join an existing league
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="inviteCode">Invite Code</Label>
              <Input
                id="inviteCode"
                name="inviteCode"
                type="text"
                placeholder="ABC-1234"
                required
                disabled={isLoading}
                className="text-lg font-mono tracking-wider uppercase"
                maxLength={8}
              />
              <p className="text-sm text-gray-500">
                Format: 3 letters, dash, 4 numbers (e.g., ABC-1234)
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Joining..." : "Join League"}
              </Button>
              <Link href="/dashboard">
                <Button type="button" variant="outline" disabled={isLoading}>
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
