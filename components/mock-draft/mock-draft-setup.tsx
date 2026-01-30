"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    <div className="max-w-lg mx-auto mt-12">
      <Card>
        <CardHeader>
          <CardTitle>Mock Draft Setup</CardTitle>
          <CardDescription>Configure your solo mock draft against AI teams.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Teams
              </label>
              <Input
                type="number"
                min={4}
                max={14}
                value={numberOfTeams}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setNumberOfTeams(val);
                  if (userPosition > val) setUserPosition(val);
                }}
              />
              <p className="text-xs text-gray-500 mt-1">Between 4 and 14</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Rounds
              </label>
              <Input
                type="number"
                min={1}
                max={20}
                value={numberOfRounds}
                onChange={(e) => setNumberOfRounds(parseInt(e.target.value, 10))}
              />
              <p className="text-xs text-gray-500 mt-1">Between 1 and 20</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Draft Position
              </label>
              <Input
                type="number"
                min={1}
                max={numberOfTeams}
                value={userPosition}
                onChange={(e) => setUserPosition(parseInt(e.target.value, 10))}
              />
              <p className="text-xs text-gray-500 mt-1">
                Pick 1 to {numberOfTeams} (snake draft)
              </p>
            </div>

            <Button type="submit" className="w-full">
              Start Mock Draft
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
