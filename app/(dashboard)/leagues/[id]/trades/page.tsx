import { auth } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getLeagueDetailsAction } from "@/lib/actions/leagues";
import { getTradesPageDataAction } from "@/lib/actions/trades";
import { getLeagueTradeBlockAction, getMyWatchlistAction } from "@/lib/actions/trade-block";
import { TradeCenter } from "@/components/trades/trade-center";

export default async function TradesPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const leagueResult = await getLeagueDetailsAction(params.id);
  if (leagueResult.error || !leagueResult.league) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-[#252830] rounded-xl border border-gray-700 p-8 text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Error</h2>
          <p className="text-gray-400">{leagueResult.error || "Failed to load league"}</p>
        </div>
      </div>
    );
  }

  const [tradesResult, tradeBlockResult, watchlistResult] = await Promise.all([
    getTradesPageDataAction(params.id),
    getLeagueTradeBlockAction(params.id),
    getMyWatchlistAction(params.id),
  ]);

  if (tradesResult.error) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-[#252830] rounded-xl border border-gray-700 p-8 text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Error</h2>
          <p className="text-gray-400">{tradesResult.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      <TradeCenter
        leagueId={params.id}
        leagueName={leagueResult.league.name}
        currentMemberId={tradesResult.currentMemberId!}
        memberRosters={tradesResult.memberRosters || []}
        trades={tradesResult.trades || []}
        tradeBlock={tradeBlockResult.players || []}
        watchlist={watchlistResult.players || []}
      />
    </div>
  );
}
