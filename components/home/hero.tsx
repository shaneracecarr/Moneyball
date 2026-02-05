import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          Your Fantasy Football
          <span className="text-indigo-600"> League Manager</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Create and manage your fantasy football leagues with ease.
          Track your team, compete with friends, and dominate your league.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
          <Link href="/signup">
            <Button size="lg" className="w-full sm:w-auto">
              Get Started
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Sign In
            </Button>
          </Link>
        </div>
        <div className="mb-12">
          <Link href="/mock-draft">
            <Button size="lg" variant="ghost" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
              Try Mock Draft →
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <div className="p-6">
            <div className="text-3xl mb-3">🏈</div>
            <h3 className="text-lg font-semibold mb-2">Easy League Setup</h3>
            <p className="text-gray-600">Create and customize your league in minutes</p>
          </div>
          <div className="p-6">
            <div className="text-3xl mb-3">👥</div>
            <h3 className="text-lg font-semibold mb-2">Invite Friends</h3>
            <p className="text-gray-600">Build your league with friends and family</p>
          </div>
          <div className="p-6">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="text-lg font-semibold mb-2">Track Performance</h3>
            <p className="text-gray-600">Real-time scoring and league standings</p>
          </div>
        </div>
      </div>
    </div>
  );
}
