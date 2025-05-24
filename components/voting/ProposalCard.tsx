"use client";

import { useState } from "react";
import VoteButton from "./VoteButton";
import { useAccount } from "wagmi";
import { ClockIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { ProposalWithResults, VotingPower } from "~~/lib/voting/types";

interface ProposalCardProps {
  proposal: ProposalWithResults;
  votingPower: VotingPower | null;
  onVote: () => void;
}

export default function ProposalCard({ proposal, votingPower, onVote }: ProposalCardProps) {
  const { address } = useAccount();
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);

  const totalVotingPower = proposal.results.reduce((sum, votes) => sum + votes, 0);
  const timeLeft = getTimeLeft(proposal.voting_end);

  return (
    <div className="bg-base-100/50 backdrop-blur-xl rounded-2xl border border-base-300/50 p-6 shadow-lg">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold mb-2">{proposal.title}</h3>
          {proposal.description && <p className="text-base-content/60 mb-4">{proposal.description}</p>}
        </div>
        <span className={`badge ${proposal.status === "active" ? "badge-success" : "badge-neutral"}`}>
          {proposal.status}
        </span>
      </div>

      {/* Options */}
      <div className="space-y-3 mb-6">
        {proposal.options.map((option, index) => {
          const votes = proposal.results[index];
          const percentage = totalVotingPower > 0 ? ((votes / totalVotingPower) * 100).toFixed(1) : "0";

          return (
            <div key={index}>
              <label className="cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {proposal.status === "active" && address && (
                      <input
                        type="radio"
                        name={`proposal-${proposal.id}`}
                        className="radio radio-primary"
                        checked={selectedChoice === index}
                        onChange={() => setSelectedChoice(index)}
                      />
                    )}
                    <span className="font-medium">{option}</span>
                  </div>
                  <span className="text-sm text-base-content/60">
                    {percentage}% ({formatVotingPower(votes)})
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-base-300/50 rounded-full h-2">
                  <div
                    className="bg-primary rounded-full h-2 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </label>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-base-content/60">
          <div className="flex items-center gap-1">
            <UserGroupIcon className="w-4 h-4" />
            <span>{proposal.totalVotes} voters</span>
          </div>
          <div className="flex items-center gap-1">
            <ClockIcon className="w-4 h-4" />
            <span>{timeLeft}</span>
          </div>
        </div>

        {proposal.status === "active" && address && selectedChoice !== null && (
          <VoteButton
            proposalId={proposal.id}
            choice={selectedChoice}
            onSuccess={onVote}
            disabled={!votingPower || votingPower.totalPower === "0"}
          />
        )}
      </div>
    </div>
  );
}

function formatVotingPower(power: number): string {
  if (power >= 1e9) return (power / 1e9).toFixed(1) + "B";
  if (power >= 1e6) return (power / 1e6).toFixed(1) + "M";
  if (power >= 1e3) return (power / 1e3).toFixed(1) + "K";
  return power.toString();
}

function getTimeLeft(endDate: Date): string {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) return "Ended";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h left`;

  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${minutes}m left`;
}
