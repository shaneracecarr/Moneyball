"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface MockDraftSetupProps {
  onStart: (settings: { numberOfTeams: number; numberOfRounds: number; userPosition: number }) => void;
}

export function MockDraftSetup({ onStart }: MockDraftSetupProps) {
  const [numberOfTeams, setNumberOfTeams] = useState(12);
  const [numberOfRounds, setNumberOfRounds] = useState(15);
  const [userPosition, setUserPosition] = useState(1);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onStart({ numberOfTeams, numberOfRounds, userPosition });
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#252830] rounded-xl border border-gray-700 overflow-hidden shadow-xl">
          {/* Header */}
          <div className="bg-[#1e2128] px-6 py-5 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white">Mock Draft Setup</h2>
            <p className="text-sm text-gray-400 mt-1">
              Configure your solo mock draft against AI teams.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Number of Teams */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Number of Teams
              </label>
              <input
                type="number"
                min={4}
                max={14}
                value={numberOfTeams}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setNumberOfTeams(val);
                  if (userPosition > val) setUserPosition(val);
                }}
                className="w-full bg-[#1a1d24] border border-gray-600 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
              <p className="text-xs text-gray-500 mt-1.5">Between 4 and 14 teams</p>
            </div>

            {/* Number of Rounds */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Number of Rounds
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={numberOfRounds}
                onChange={(e) => setNumberOfRounds(parseInt(e.target.value, 10))}
                className="w-full bg-[#1a1d24] border border-gray-600 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
              <p className="text-xs text-gray-500 mt-1.5">Between 1 and 20 rounds</p>
            </div>

            {/* Draft Position */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Your Draft Position
              </label>
              <input
                type="number"
                min={1}
                max={numberOfTeams}
                value={userPosition}
                onChange={(e) => setUserPosition(parseInt(e.target.value, 10))}
                className="w-full bg-[#1a1d24] border border-gray-600 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
              <p className="text-xs text-gray-500 mt-1.5">
                Pick 1 to {numberOfTeams} (snake draft format)
              </p>
            </div>

            {/* Draft Order Preview */}
            <div className="bg-[#1a1d24] rounded-lg p-4 border border-gray-700">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Draft Order Preview
              </h4>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: numberOfTeams }, (_, i) => i + 1).map((pos) => (
                  <div
                    key={pos}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                      pos === userPosition
                        ? "bg-purple-600 text-white"
                        : "bg-gray-700 text-gray-400"
                    }`}
                  >
                    {pos}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                You pick at position {userPosition}
                {userPosition === 1 && " (first overall)"}
                {userPosition === numberOfTeams && " (last in round 1, first in round 2)"}
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5"
            >
              Start Mock Draft
            </Button>
          </form>
        </div>

        {/* Additional info */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            AI teams will pick the best available player by ADP
          </p>
        </div>
      </div>
    </div>
  );
}
