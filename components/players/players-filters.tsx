"use client";

import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect } from "react";

interface PlayersFiltersProps {
  currentSearch: string;
  currentPosition: string;
  currentTeam: string;
  currentAvailability: string;
  currentSort: string;
  hasActiveLeague: boolean;
}

const POSITIONS = ["QB", "RB", "WR", "TE", "K", "DEF"];

const NFL_TEAMS = [
  "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE",
  "DAL", "DEN", "DET", "GB", "HOU", "IND", "JAX", "KC",
  "LAC", "LAR", "LV", "MIA", "MIN", "NE", "NO", "NYG",
  "NYJ", "PHI", "PIT", "SEA", "SF", "TB", "TEN", "WAS",
];

export function PlayersFilters({
  currentSearch,
  currentPosition,
  currentTeam,
  currentAvailability,
  currentSort,
  hasActiveLeague,
}: PlayersFiltersProps) {
  const router = useRouter();
  const [search, setSearch] = useState(currentSearch);
  const [position, setPosition] = useState(currentPosition);
  const [team, setTeam] = useState(currentTeam);
  const [availability, setAvailability] = useState(currentAvailability);
  const [sort, setSort] = useState(currentSort);

  useEffect(() => {
    setSearch(currentSearch);
    setPosition(currentPosition);
    setTeam(currentTeam);
    setAvailability(currentAvailability);
    setSort(currentSort);
  }, [currentSearch, currentPosition, currentTeam, currentAvailability, currentSort]);

  function buildUrl() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (position) params.set("position", position);
    if (team) params.set("team", team);
    if (availability !== "all") params.set("availability", availability);
    if (sort !== "adp") params.set("sort", sort);
    params.set("page", "1");
    return `/players?${params.toString()}`;
  }

  function handleFilter() {
    router.push(buildUrl());
  }

  function handleClear() {
    setSearch("");
    setPosition("");
    setTeam("");
    setAvailability("all");
    setSort("adp");
    router.push("/players");
  }

  return (
    <Card className="mb-6">
      <CardContent className="pt-6 space-y-4">
        {/* Row 1: Search, Position, Team, Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="search">Search by Name</Label>
            <Input
              id="search"
              placeholder="Player name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleFilter();
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="position">Position</Label>
            <select
              id="position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
            >
              <option value="">All Positions</option>
              {POSITIONS.map((pos) => (
                <option key={pos} value={pos}>
                  {pos}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="team">Team</Label>
            <select
              id="team"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
            >
              <option value="">All Teams</option>
              {NFL_TEAMS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 flex items-end gap-2">
            <Button onClick={handleFilter} className="flex-1">
              Filter
            </Button>
            <Button onClick={handleClear} variant="outline">
              Clear
            </Button>
          </div>
        </div>

        {/* Row 2: Availability toggle + Sort */}
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Show:</span>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  setAvailability("all");
                  const params = new URLSearchParams();
                  if (search) params.set("search", search);
                  if (position) params.set("position", position);
                  if (team) params.set("team", team);
                  if (sort !== "adp") params.set("sort", sort);
                  params.set("page", "1");
                  router.push(`/players?${params.toString()}`);
                }}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  availability === "all"
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                All Players
              </button>
              <button
                type="button"
                disabled={!hasActiveLeague}
                onClick={() => {
                  if (!hasActiveLeague) return;
                  setAvailability("free_agents");
                  const params = new URLSearchParams();
                  if (search) params.set("search", search);
                  if (position) params.set("position", position);
                  if (team) params.set("team", team);
                  params.set("availability", "free_agents");
                  if (sort !== "adp") params.set("sort", sort);
                  params.set("page", "1");
                  router.push(`/players?${params.toString()}`);
                }}
                className={`px-3 py-1.5 text-sm font-medium transition-colors border-l border-gray-300 ${
                  availability === "free_agents"
                    ? "bg-indigo-600 text-white"
                    : hasActiveLeague
                    ? "bg-white text-gray-700 hover:bg-gray-50"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
                title={hasActiveLeague ? undefined : "Select a league first"}
              >
                Free Agents (This League)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Sort:</span>
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                const params = new URLSearchParams();
                if (search) params.set("search", search);
                if (position) params.set("position", position);
                if (team) params.set("team", team);
                if (availability !== "all") params.set("availability", availability);
                if (e.target.value !== "adp") params.set("sort", e.target.value);
                params.set("page", "1");
                router.push(`/players?${params.toString()}`);
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
            >
              <option value="adp">ADP (Rank)</option>
              <option value="points">Season Points</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
