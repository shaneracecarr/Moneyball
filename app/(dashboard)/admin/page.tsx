"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import {
  adminStartWeekAction,
  adminAdvanceWeekAction,
  getGlobalWeekStatusAction,
  checkIsAdminAction,
} from "@/lib/actions/admin-week";

type ImportResult = {
  success?: boolean;
  created?: number;
  updated?: number;
  synced?: number;
  skipped?: number;
  teamErrors?: number;
  addedKickers?: number;
  notFound?: number;
  message?: string;
  error?: string;
  details?: string;
};

type HistoryImportResult = {
  success?: boolean;
  processed?: number;
  gamesImported?: number;
  offset?: number;
  nextOffset?: number;
  complete?: boolean;
  message?: string;
  error?: string;
  details?: string;
  errors?: string[];
};

function ImportButton({
  label,
  loadingLabel,
  endpoint,
  description,
}: {
  label: string;
  loadingLabel: string;
  endpoint: string;
  description: string;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleClick() {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(endpoint, { method: "POST" });
      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setResult({ error: data.error || "Request failed", details: data.details });
      }
    } catch {
      setResult({ error: "Network error occurred" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleClick} disabled={loading}>
          {loading ? loadingLabel : label}
        </Button>

        {loading && (
          <div className="text-sm text-gray-600">
            This may take a minute... Fetching data from the API.
          </div>
        )}

        {result && (
          <div
            className={`rounded-lg p-4 ${result.error
                ? "bg-red-50 text-red-800"
                : "bg-green-50 text-green-800"
              }`}
          >
            {result.error ? (
              <div>
                <p className="font-semibold">{result.error}</p>
                {result.details && (
                  <p className="text-sm mt-1">{result.details}</p>
                )}
              </div>
            ) : (
              <div>
                <p className="font-semibold">{result.message}</p>
                <div className="text-sm mt-1 space-y-0.5">
                  {result.created !== undefined && (
                    <p>Created: {result.created}</p>
                  )}
                  {result.updated !== undefined && (
                    <p>Updated: {result.updated}</p>
                  )}
                  {result.synced !== undefined && (
                    <p>Synced: {result.synced}</p>
                  )}
                  {result.skipped !== undefined && (
                    <p>Skipped: {result.skipped}</p>
                  )}
                  {result.addedKickers !== undefined && (
                    <p>Added Kickers: {result.addedKickers}</p>
                  )}
                  {result.notFound !== undefined && (
                    <p className="text-amber-700">Not Found: {result.notFound}</p>
                  )}
                  {result.teamErrors !== undefined && result.teamErrors > 0 && (
                    <p className="text-amber-700">
                      Team fetch errors: {result.teamErrors}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HistoryImportButton() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{
    totalProcessed: number;
    totalGames: number;
    currentOffset: number;
    complete: boolean;
  }>({ totalProcessed: 0, totalGames: 0, currentOffset: 0, complete: false });
  const [error, setError] = useState<string | null>(null);

  async function runBatch(offset: number): Promise<HistoryImportResult> {
    const response = await fetch(`/api/players/import-history?offset=${offset}&batchSize=25`, {
      method: "POST",
    });
    return response.json();
  }

  async function handleClick() {
    setLoading(true);
    setError(null);
    setProgress({ totalProcessed: 0, totalGames: 0, currentOffset: 0, complete: false });

    let offset = 0;
    let totalProcessed = 0;
    let totalGames = 0;

    try {
      while (true) {
        const result = await runBatch(offset);

        if (result.error) {
          setError(result.error + (result.details ? `: ${result.details}` : ""));
          break;
        }

        totalProcessed += result.processed || 0;
        totalGames += result.gamesImported || 0;
        offset = result.nextOffset || offset;

        setProgress({
          totalProcessed,
          totalGames,
          currentOffset: offset,
          complete: result.complete || false,
        });

        if (result.complete) {
          break;
        }

        // Small delay between batches
        await new Promise((r) => setTimeout(r, 1000));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-2 border-blue-200">
      <CardHeader>
        <CardTitle>Import Historical Stats (3 Years)</CardTitle>
        <CardDescription>
          Pull game-by-game stats for all active fantasy players (QB, RB, WR, TE, K) for the past 3 seasons (2022-2024).
          This runs in batches and may take several minutes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleClick} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
          {loading ? "Importing..." : "Import Historical Stats"}
        </Button>

        {loading && (
          <div className="bg-blue-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
              <span className="text-blue-800 font-medium">Import in progress...</span>
            </div>
            <div className="text-sm text-blue-700 space-y-1">
              <p>Players processed: {progress.totalProcessed}</p>
              <p>Games imported: {progress.totalGames}</p>
              <p>Current offset: {progress.currentOffset}</p>
            </div>
            <p className="text-xs text-blue-600">Do not close this page. Running in batches to avoid timeouts.</p>
          </div>
        )}

        {!loading && progress.complete && (
          <div className="bg-green-50 rounded-lg p-4 text-green-800">
            <p className="font-semibold">Import Complete!</p>
            <p className="text-sm">
              Processed {progress.totalProcessed} players, imported {progress.totalGames} game records.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 rounded-lg p-4 text-red-800">
            <p className="font-semibold">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type WeekStatus = {
  currentWeek: number;
  totalActiveLeagues: number;
  preWeekCount: number;
  weekActiveCount: number;
  isAdmin: boolean;
};

function WeekControlsCard() {
  const [status, setStatus] = useState<WeekStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    async function loadStatus() {
      const result = await getGlobalWeekStatusAction();
      if (result.error) {
        setError(result.error);
      } else {
        setStatus(result as WeekStatus);
      }
    }
    loadStatus();
  }, []);

  const handleStartWeek = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await adminStartWeekAction();
      if (result.error) {
        setError(result.error);
      } else {
        setMessage(result.message || "Week started!");
        router.refresh();
        // Refresh status
        const newStatus = await getGlobalWeekStatusAction();
        if (!newStatus.error) setStatus(newStatus as WeekStatus);
      }
    });
  };

  const handleAdvanceWeek = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await adminAdvanceWeekAction();
      if (result.error) {
        setError(result.error);
      } else {
        setMessage(result.message || "Week advanced!");
        router.refresh();
        // Refresh status
        const newStatus = await getGlobalWeekStatusAction();
        if (!newStatus.error) setStatus(newStatus as WeekStatus);
      }
    });
  };

  if (!status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Season Week Controls</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-indigo-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          Season Week Controls
          <span className="text-sm font-normal bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full">
            Week {status.currentWeek}
          </span>
        </CardTitle>
        <CardDescription>
          Control the season week across all leagues on the platform. This is a global action.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Summary */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{status.totalActiveLeagues}</p>
            <p className="text-xs text-gray-500">Active Leagues</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{status.preWeekCount}</p>
            <p className="text-xs text-gray-500">Pre-Week</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{status.weekActiveCount}</p>
            <p className="text-xs text-gray-500">Week Active</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleStartWeek}
            disabled={isPending || status.preWeekCount === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            {isPending ? "Processing..." : `Start Week ${status.currentWeek}`}
          </Button>
          <Button
            onClick={handleAdvanceWeek}
            disabled={isPending || status.weekActiveCount === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isPending ? "Processing..." : `Score & End Week ${status.currentWeek}`}
          </Button>
        </div>

        {/* Feedback */}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
        )}
        {message && (
          <p className="text-sm text-green-700 bg-green-50 p-3 rounded-lg">{message}</p>
        )}

        {/* Help Text */}
        <div className="text-xs text-gray-500 space-y-1 border-t pt-3">
          <p><strong>Start Week:</strong> Transitions all pre-week leagues to active. Do this when the NFL week begins.</p>
          <p><strong>Score & End Week:</strong> Scores all matchups, records W/L, updates standings, and advances to the next week.</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkAdmin() {
      const result = await checkIsAdminAction();
      setIsAdmin(result.isAdmin);
    }
    checkAdmin();
  }, []);

  if (isAdmin === null) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Access Denied</CardTitle>
            <CardDescription>
              You do not have admin privileges to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link href="/dashboard">
          <Button variant="outline" size="sm">
            ← Back to Dashboard
          </Button>
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Panel</h1>

      <div className="grid gap-6">
        {/* Week Controls - Prominent at the top */}
        <WeekControlsCard />

        <ImportButton
          label="Import Fantasy Players"
          loadingLabel="Importing Fantasy Players..."
          endpoint="/api/players/import-fantasy"
          description="Pull fantasy-relevant players (QB, RB, WR, TE, K, DEF) from the NFL API and upsert them into the global players table. Safe to run multiple times."
        />

        <ImportButton
          label="Import ADP (Average Draft Position)"
          loadingLabel="Importing ADP Data..."
          endpoint="/api/players/import-adp"
          description="Pull ADP data from RapidAPI (half PPR format). Updates existing players with ADP values and adds any missing kickers to the database. Players will be sorted by ADP in drafts and player lists."
        />

        <ImportButton
          label="Import Full Player Stats"
          loadingLabel="Importing Player Stats..."
          endpoint="/api/players/import-stats"
          description="Pull ALL players with full season stats from every NFL team roster. Stores passing, rushing, receiving, and defensive stats plus metadata. Fetches all 32 teams sequentially."
        />

        <HistoryImportButton />

        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
            <CardDescription>Navigate to other admin features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/players">
              <Button variant="outline" className="w-full justify-start">
                View All Players
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
