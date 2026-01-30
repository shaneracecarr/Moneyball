"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type WeekResult = {
  team1Name: string;
  team2Name: string;
  team1Score: number;
  team2Score: number;
};

interface WeekResultsProps {
  week: number;
  results: WeekResult[];
  onClose: () => void;
}

export function WeekResults({ week, results, onClose }: WeekResultsProps) {
  return (
    <Card className="border-green-200 bg-green-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Week {week} Results</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Dismiss
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {results.map((result, index) => {
            const team1Won = result.team1Score > result.team2Score;
            const team2Won = result.team2Score > result.team1Score;
            return (
              <div
                key={index}
                className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3"
              >
                <div className="flex-1 text-left">
                  <p
                    className={`text-sm ${
                      team1Won ? "font-bold text-green-700" : "text-gray-700"
                    }`}
                  >
                    {result.team1Name}
                  </p>
                </div>
                <div className="px-4 text-center">
                  <p className="text-lg font-bold tabular-nums">
                    <span className={team1Won ? "text-green-700" : "text-gray-600"}>
                      {result.team1Score.toFixed(1)}
                    </span>
                    <span className="text-gray-400 mx-2">-</span>
                    <span className={team2Won ? "text-green-700" : "text-gray-600"}>
                      {result.team2Score.toFixed(1)}
                    </span>
                  </p>
                </div>
                <div className="flex-1 text-right">
                  <p
                    className={`text-sm ${
                      team2Won ? "font-bold text-green-700" : "text-gray-700"
                    }`}
                  >
                    {result.team2Name}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
