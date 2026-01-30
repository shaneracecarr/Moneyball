"use client";

import { useState } from "react";
import { createLeagueAction } from "@/lib/actions/leagues";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { DEFAULT_LEAGUE_SETTINGS } from "@/lib/league-settings";

export default function CreateLeaguePage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_LEAGUE_SETTINGS);

  const totalStarters = settings.qbCount + settings.rbCount + settings.wrCount +
    settings.teCount + settings.flexCount + settings.kCount + settings.defCount;
  const totalRoster = totalStarters + settings.benchCount + settings.irCount;

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError(null);

    const result = await createLeagueAction(formData);

    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
    }
  }

  function updateSetting(key: keyof typeof settings, value: number | string | boolean | null) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Create New League</CardTitle>
          <CardDescription>
            Set up a new fantasy football league and invite your friends
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">League Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="My Awesome League"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="numberOfTeams">Number of Teams</Label>
              <select
                id="numberOfTeams"
                name="numberOfTeams"
                required
                disabled={isLoading}
                className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="8">8 Teams</option>
                <option value="10">10 Teams</option>
                <option value="12" defaultValue="12">12 Teams</option>
                <option value="14">14 Teams</option>
                <option value="16">16 Teams</option>
              </select>
            </div>

            {/* Toggle Settings */}
            <div>
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500 flex items-center gap-1"
              >
                {showSettings ? "▼" : "▶"} League Settings
                <span className="text-gray-400 font-normal ml-1">
                  (scoring, roster slots, trades)
                </span>
              </button>
            </div>

            {showSettings && (
              <div className="space-y-6 border rounded-lg p-4 bg-gray-50">
                {/* Scoring Format */}
                <div className="space-y-2">
                  <Label htmlFor="scoringFormat">Scoring Format</Label>
                  <select
                    id="scoringFormat"
                    name="scoringFormat"
                    value={settings.scoringFormat}
                    onChange={(e) => updateSetting("scoringFormat", e.target.value)}
                    disabled={isLoading}
                    className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="standard">Standard</option>
                    <option value="half_ppr">Half PPR</option>
                    <option value="ppr">Full PPR</option>
                  </select>
                </div>

                {/* Roster Slots */}
                <div className="space-y-3">
                  <Label className="text-base">Roster Positions</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <PositionInput label="QB" name="qbCount" value={settings.qbCount} min={1} max={3} onChange={(v) => updateSetting("qbCount", v)} disabled={isLoading} />
                    <PositionInput label="RB" name="rbCount" value={settings.rbCount} min={1} max={4} onChange={(v) => updateSetting("rbCount", v)} disabled={isLoading} />
                    <PositionInput label="WR" name="wrCount" value={settings.wrCount} min={1} max={4} onChange={(v) => updateSetting("wrCount", v)} disabled={isLoading} />
                    <PositionInput label="TE" name="teCount" value={settings.teCount} min={1} max={3} onChange={(v) => updateSetting("teCount", v)} disabled={isLoading} />
                    <PositionInput label="FLEX" name="flexCount" value={settings.flexCount} min={0} max={3} onChange={(v) => updateSetting("flexCount", v)} disabled={isLoading} />
                    <PositionInput label="K" name="kCount" value={settings.kCount} min={0} max={2} onChange={(v) => updateSetting("kCount", v)} disabled={isLoading} />
                    <PositionInput label="DEF" name="defCount" value={settings.defCount} min={0} max={2} onChange={(v) => updateSetting("defCount", v)} disabled={isLoading} />
                    <PositionInput label="Bench" name="benchCount" value={settings.benchCount} min={4} max={10} onChange={(v) => updateSetting("benchCount", v)} disabled={isLoading} />
                    <PositionInput label="IR" name="irCount" value={settings.irCount} min={0} max={4} onChange={(v) => updateSetting("irCount", v)} disabled={isLoading} />
                  </div>
                  <p className="text-xs text-gray-500">
                    {totalStarters} starters + {settings.benchCount} bench + {settings.irCount} IR = {totalRoster} total roster spots
                  </p>
                </div>

                {/* Trade Settings */}
                <div className="space-y-3">
                  <Label className="text-base">Trade Settings</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="tradesEnabled"
                      name="tradesEnabled"
                      checked={settings.tradesEnabled}
                      onChange={(e) => updateSetting("tradesEnabled", e.target.checked)}
                      disabled={isLoading}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                    />
                    <input type="hidden" name="tradesEnabled" value={settings.tradesEnabled ? "true" : "false"} />
                    <Label htmlFor="tradesEnabled" className="text-sm font-normal">
                      Enable trades
                    </Label>
                  </div>
                  {settings.tradesEnabled && (
                    <div className="space-y-2">
                      <Label htmlFor="tradeDeadlineWeek">Trade Deadline Week (optional)</Label>
                      <select
                        id="tradeDeadlineWeek"
                        name="tradeDeadlineWeek"
                        value={settings.tradeDeadlineWeek ?? ""}
                        onChange={(e) => updateSetting("tradeDeadlineWeek", e.target.value ? Number(e.target.value) : null)}
                        disabled={isLoading}
                        className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">No deadline</option>
                        {Array.from({ length: 17 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>Week {i + 1}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create League"}
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

function PositionInput({
  label,
  name,
  value,
  min,
  max,
  onChange,
  disabled,
}: {
  label: string;
  name: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name} className="text-xs">{label}</Label>
      <Input
        id={name}
        name={name}
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="h-9 text-sm"
      />
    </div>
  );
}
