"use client";

import { formatEther } from "viem";
import { ChartBarIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { VotingPower } from "~~/lib/voting/types";

interface VotingPowerDisplayProps {
  power: VotingPower;
  totalValueLocked?: bigint;
  className?: string;
}

export default function VotingPowerDisplay({ power, totalValueLocked, className = "" }: VotingPowerDisplayProps) {
  if (!power || !power.totalPower) {
    return null; // Don't render if no power data
  }

  const formattedPower = formatEther(BigInt(power.totalPower || "0"));

  // Calculate voting power percentage (same as staking page)
  const votingPowerPercentage =
    totalValueLocked && power.totalPower
      ? ((Number(power.totalPower) / Number(totalValueLocked)) * 100).toFixed(4)
      : "0";

  return (
    <div className={`bg-base-100/50 backdrop-blur-xl rounded-2xl border border-base-300/50 p-6 shadow-lg ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Your Voting Power</h3>
        <ChartBarIcon className="w-5 h-5 text-primary" />
      </div>

      <div className="mb-4">
        <p className="text-3xl font-bold">
          {Number(formattedPower).toLocaleString()}
          <span className="text-lg font-normal text-base-content/60 ml-2">votes</span>
        </p>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-sm text-base-content/60">Block #{power?.blockNumber || 0}</p>
          {totalValueLocked && (
            <>
              <span className="text-base-content/40">•</span>
              <p className="text-sm text-primary font-medium">{votingPowerPercentage}% of total</p>
            </>
          )}
        </div>
      </div>

      {/* Breakdown */}
      {power?.breakdown && power.breakdown.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-base-content/80 mb-2">Position Breakdown:</p>
          {power.breakdown.map((position, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <LockClosedIcon className="w-4 h-4 text-base-content/60" />
                <span className="text-base-content/80">
                  {Number(formatEther(BigInt(position.amount))).toLocaleString()} ATA
                </span>
                <span className="text-base-content/60">({position.weeks}w)</span>
              </div>
              <span className="font-medium text-primary">{position.multiplier}x</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
