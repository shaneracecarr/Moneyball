"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

interface PlayersFiltersProps {
  currentSearch: string;
  currentPosition: string;
  currentTeam: string;
  currentAvailability: string;
  currentSort: string;
  currentSortDir: string;
  hasActiveLeague: boolean;
}

const POSITIONS = ["ALL", "QB", "RB", "WR", "TE", "K", "DEF"];

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
  currentSortDir,
  hasActiveLeague,
}: PlayersFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(currentSearch);

  useEffect(() => {
    setSearch(currentSearch);
  }, [currentSearch]);

  const buildUrl = useCallback((overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();

    const newSearch = overrides.search !== undefined ? overrides.search : currentSearch;
    const newPosition = overrides.position !== undefined ? overrides.position : currentPosition;
    const newTeam = overrides.team !== undefined ? overrides.team : currentTeam;
    const newAvailability = overrides.availability !== undefined ? overrides.availability : currentAvailability;
    const newSort = overrides.sort !== undefined ? overrides.sort : currentSort;
    const newDir = overrides.dir !== undefined ? overrides.dir : currentSortDir;

    if (newSearch) params.set("search", newSearch);
    if (newPosition) params.set("position", newPosition);
    if (newTeam) params.set("team", newTeam);
    if (newAvailability !== "all") params.set("availability", newAvailability);
    if (newSort !== "adp") params.set("sort", newSort);
    if (newDir && newDir !== "asc" && newSort === "adp") params.set("dir", newDir);
    if (newDir && newDir !== "desc" && newSort !== "adp" && newSort !== "name") params.set("dir", newDir);
    params.set("page", "1");

    return `/players?${params.toString()}`;
  }, [currentSearch, currentPosition, currentTeam, currentAvailability, currentSort, currentSortDir]);

  function handlePositionClick(pos: string) {
    const newPosition = pos === "ALL" ? "" : pos;
    router.push(buildUrl({ position: newPosition }));
  }

  function handleSearch() {
    router.push(buildUrl({ search }));
  }

  function handleTeamChange(newTeam: string) {
    router.push(buildUrl({ team: newTeam }));
  }

  function handleAvailabilityToggle(newAvailability: string) {
    router.push(buildUrl({ availability: newAvailability }));
  }

  function handleClear() {
    setSearch("");
    router.push("/players");
  }

  return (
    <div className="mb-4 space-y-3">
      {/* Position Tabs */}
      <div className="flex items-center gap-1 bg-[#1a1d24] rounded-lg p-1 w-fit">
        {POSITIONS.map((pos) => {
          const isActive = pos === "ALL" ? !currentPosition : currentPosition === pos;
          return (
            <button
              key={pos}
              onClick={() => handlePositionClick(pos)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? "bg-purple-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-700"
              }`}
            >
              {pos}
            </button>
          );
        })}
      </div>

      {/* Search and Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Find player..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            className="w-64 bg-[#1a1d24] border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Team Filter */}
        <select
          value={currentTeam}
          onChange={(e) => handleTeamChange(e.target.value)}
          className="bg-[#1a1d24] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
        >
          <option value="">All Teams</option>
          {NFL_TEAMS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {/* Availability Toggle */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={currentAvailability === "free_agents"}
              disabled={!hasActiveLeague}
              onChange={(e) => handleAvailabilityToggle(e.target.checked ? "free_agents" : "all")}
              className="w-4 h-4 rounded border-gray-600 bg-[#1a1d24] text-purple-600 focus:ring-purple-500 focus:ring-offset-0 disabled:opacity-50"
            />
            <span className={`text-sm ${hasActiveLeague ? "text-gray-300" : "text-gray-500"}`}>
              Free agents
            </span>
          </label>
        </div>

        {/* Clear Button */}
        {(currentSearch || currentPosition || currentTeam || currentAvailability !== "all") && (
          <button
            onClick={handleClear}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
