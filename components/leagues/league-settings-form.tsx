"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateLeagueSettingsAction } from "@/lib/actions/settings";
import type { LeagueSettings } from "@/lib/league-settings";

const SCORING_LABELS: Record<string, string> = {
  standard: "Standard",
  half_ppr: "Half PPR",
  ppr: "Full PPR",
};

const WAIVER_TYPE_LABELS: Record<string, string> = {
  none: "No Waivers (Free Agency Only)",
  standard: "Standard (Reverse Standings Priority)",
  faab: "FAAB (Free Agent Acquisition Budget)",
};

interface LeagueSettingsFormProps {
  leagueId: string;
  settings: LeagueSettings;
  isCommissioner: boolean;
  locked: boolean;
  isMock?: boolean;
}

export function LeagueSettingsForm({
  leagueId,
  settings: initialSettings,
  isCommissioner,
  locked,
  isMock = false,
}: LeagueSettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [settings, setSettings] = useState(initialSettings);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const editable = isCommissioner && !locked;

  const totalStarters = settings.qbCount + settings.rbCount + settings.wrCount +
    settings.teCount + settings.flexCount + settings.kCount + settings.defCount;
  const totalRoster = totalStarters + settings.benchCount + settings.irCount;

  function updateSetting(key: keyof LeagueSettings, value: number | string | boolean | null) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSuccess(false);
  }

  function handleSave() {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await updateLeagueSettingsAction(leagueId, settings);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {locked && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
          Settings are locked because the draft has already started. Settings can only be changed before the draft begins.
        </div>
      )}

      {/* Scoring Format */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Scoring</CardTitle>
          <CardDescription>How points are calculated</CardDescription>
        </CardHeader>
        <CardContent>
          {editable ? (
            <div className="space-y-2">
              <Label htmlFor="scoringFormat">Scoring Format</Label>
              <select
                id="scoringFormat"
                value={settings.scoringFormat}
                onChange={(e) => updateSetting("scoringFormat", e.target.value)}
                disabled={isPending}
                className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="standard">Standard</option>
                <option value="half_ppr">Half PPR</option>
                <option value="ppr">Full PPR</option>
              </select>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500">Scoring Format</p>
              <p className="text-lg font-medium">{SCORING_LABELS[settings.scoringFormat]}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Roster Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Roster Positions</CardTitle>
          <CardDescription>
            {totalStarters} starters + {settings.benchCount} bench + {settings.irCount} IR = {totalRoster} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {editable ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <PositionInput label="QB" value={settings.qbCount} min={1} max={3} onChange={(v) => updateSetting("qbCount", v)} disabled={isPending} />
                <PositionInput label="RB" value={settings.rbCount} min={1} max={4} onChange={(v) => updateSetting("rbCount", v)} disabled={isPending} />
                <PositionInput label="WR" value={settings.wrCount} min={1} max={4} onChange={(v) => updateSetting("wrCount", v)} disabled={isPending} />
                <PositionInput label="TE" value={settings.teCount} min={1} max={3} onChange={(v) => updateSetting("teCount", v)} disabled={isPending} />
                <PositionInput label="FLEX" value={settings.flexCount} min={0} max={3} onChange={(v) => updateSetting("flexCount", v)} disabled={isPending} />
                <PositionInput label="K" value={settings.kCount} min={0} max={2} onChange={(v) => updateSetting("kCount", v)} disabled={isPending} />
                <PositionInput label="DEF" value={settings.defCount} min={0} max={2} onChange={(v) => updateSetting("defCount", v)} disabled={isPending} />
                <PositionInput label="Bench" value={settings.benchCount} min={4} max={10} onChange={(v) => updateSetting("benchCount", v)} disabled={isPending} />
                <PositionInput label="IR" value={settings.irCount} min={0} max={4} onChange={(v) => updateSetting("irCount", v)} disabled={isPending} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <ReadOnlyPosition label="QB" count={settings.qbCount} />
              <ReadOnlyPosition label="RB" count={settings.rbCount} />
              <ReadOnlyPosition label="WR" count={settings.wrCount} />
              <ReadOnlyPosition label="TE" count={settings.teCount} />
              <ReadOnlyPosition label="FLEX" count={settings.flexCount} />
              <ReadOnlyPosition label="K" count={settings.kCount} />
              <ReadOnlyPosition label="DEF" count={settings.defCount} />
              <ReadOnlyPosition label="Bench" count={settings.benchCount} />
              <ReadOnlyPosition label="IR" count={settings.irCount} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Draft Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Draft</CardTitle>
          <CardDescription>Draft pick timer configuration</CardDescription>
        </CardHeader>
        <CardContent>
          {editable ? (
            <div className="space-y-2">
              <Label htmlFor="draftTimerSeconds">Pick Timer (seconds)</Label>
              <Input
                id="draftTimerSeconds"
                type="number"
                min={30}
                max={600}
                value={settings.draftTimerSeconds}
                onChange={(e) => updateSetting("draftTimerSeconds", Number(e.target.value))}
                disabled={isPending}
                className="h-9 text-sm max-w-[200px]"
              />
              <p className="text-xs text-gray-500">
                Time allowed per pick ({Math.floor(settings.draftTimerSeconds / 60)}:{String(settings.draftTimerSeconds % 60).padStart(2, "0")} min). Range: 30s to 600s.
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500">Pick Timer</p>
              <p className="text-lg font-medium">
                {Math.floor(settings.draftTimerSeconds / 60)}:{String(settings.draftTimerSeconds % 60).padStart(2, "0")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trade Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Trades</CardTitle>
          <CardDescription>Trade rules and deadlines</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {editable ? (
            <>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="tradesEnabled"
                  checked={settings.tradesEnabled}
                  onChange={(e) => updateSetting("tradesEnabled", e.target.checked)}
                  disabled={isPending}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                />
                <Label htmlFor="tradesEnabled" className="text-sm font-normal">
                  Enable trades
                </Label>
              </div>
              {settings.tradesEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="tradeDeadlineWeek">Trade Deadline Week</Label>
                  <select
                    id="tradeDeadlineWeek"
                    value={settings.tradeDeadlineWeek ?? ""}
                    onChange={(e) => updateSetting("tradeDeadlineWeek", e.target.value ? Number(e.target.value) : null)}
                    disabled={isPending}
                    className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">No deadline</option>
                    {Array.from({ length: 17 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>Week {i + 1}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-500">Trades</p>
                <p className="font-medium">{settings.tradesEnabled ? "Enabled" : "Disabled"}</p>
              </div>
              {settings.tradesEnabled && settings.tradeDeadlineWeek && (
                <div>
                  <p className="text-sm text-gray-500">Trade Deadline</p>
                  <p className="font-medium">Week {settings.tradeDeadlineWeek}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Waiver Settings - Only show for non-mock leagues */}
      {!isMock && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Waivers</CardTitle>
            <CardDescription>How free agent acquisitions are handled</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {editable ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="waiverType">Waiver System</Label>
                  <select
                    id="waiverType"
                    value={settings.waiverType}
                    onChange={(e) => {
                      const newType = e.target.value as "none" | "standard" | "faab";
                      updateSetting("waiverType", newType);
                      if (newType !== "faab") {
                        updateSetting("faabBudget", null);
                      } else if (!settings.faabBudget) {
                        updateSetting("faabBudget", 100);
                      }
                    }}
                    disabled={isPending}
                    className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="standard">Standard (Reverse Standings Priority)</option>
                    <option value="faab">FAAB (Free Agent Acquisition Budget)</option>
                  </select>
                </div>

                {settings.waiverType === "standard" && (
                  <p className="text-xs text-gray-500">
                    Waiver priority is based on reverse standings — last place gets first priority.
                    After a successful claim, that team moves to the back of the waiver order.
                  </p>
                )}

                {settings.waiverType === "faab" && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="faabBudget">Season Budget ($)</Label>
                      <Input
                        id="faabBudget"
                        type="number"
                        min={50}
                        max={1000}
                        value={settings.faabBudget ?? 100}
                        onChange={(e) => updateSetting("faabBudget", Number(e.target.value))}
                        disabled={isPending}
                        className="h-10 max-w-[200px]"
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Each team gets ${settings.faabBudget ?? 100} to bid on waiver players all season.
                      Highest bid wins. Ties broken by reverse standings. Teams can bid $0.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-500">Waiver System</p>
                  <p className="font-medium">{WAIVER_TYPE_LABELS[settings.waiverType] || "Standard"}</p>
                </div>
                {settings.waiverType === "faab" && settings.faabBudget && (
                  <div>
                    <p className="text-sm text-gray-500">FAAB Budget</p>
                    <p className="font-medium">${settings.faabBudget}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mock League Notice */}
      {isMock && (
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="text-lg text-purple-900">Free Agency Only</CardTitle>
            <CardDescription className="text-purple-700">
              Mock leagues do not have waivers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-purple-700">
              All players in this mock league are free agents and can be picked up instantly
              (first come, first served) until their game starts.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      {editable && (
        <div className="space-y-3">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              Settings saved successfully.
            </div>
          )}
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      )}
    </div>
  );
}

function PositionInput({
  label,
  value,
  min,
  max,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
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

function ReadOnlyPosition({ label, count }: { label: string; count: number }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-medium">{count}</p>
    </div>
  );
}
