"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { PlusIcon } from "@heroicons/react/24/outline";
import ProposalCard from "~~/components/voting/ProposalCard";
import VotingPowerDisplay from "~~/components/voting/VotingPowerDisplay";
import { ProposalWithResults, VotingPower } from "~~/lib/voting/types";

export default function VotingPage() {
  const { address, isConnected } = useAccount();
  const [proposals, setProposals] = useState<ProposalWithResults[]>([]);
  const [votingPower, setVotingPower] = useState<VotingPower | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchVotingPower = useCallback(async () => {
    if (!address) return;
    try {
      const res = await fetch(`/api/voting/power/${address}`);
      const data = await res.json();
      setVotingPower(data);
    } catch (error) {
      console.error("Failed to fetch voting power:", error);
    }
  }, [address]);

  useEffect(() => {
    if (address) {
      fetchVotingPower();
    }
  }, [address, fetchVotingPower]);

  async function fetchProposals() {
    try {
      const res = await fetch("/api/voting/proposals");
      const data = await res.json();
      // Ensure we have an array even if API returns error
      setProposals(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch proposals:", error);
      setProposals([]);
    } finally {
      setLoading(false);
    }
  }

  const activeProposals = proposals.filter(p => p.status === "active");
  const pastProposals = proposals.filter(p => p.status === "ended");

  return (
    <div className="min-h-screen bg-gradient-to-b from-base-100 to-base-200">
      <div className="container mx-auto max-w-6xl px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">ATA Voting</h1>
          <p className="text-lg text-base-content/60">Vote on feature requests and development priorities</p>
        </div>

        {/* Voting Power Display */}
        {isConnected && votingPower && <VotingPowerDisplay power={votingPower} className="mb-8" />}

        {/* Active Proposals */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Active Proposals</h2>
            {/* Add admin check here */}
            <button className="btn btn-primary btn-sm gap-2">
              <PlusIcon className="w-4 h-4" />
              Create Proposal
            </button>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton h-32 w-full"></div>
              ))}
            </div>
          ) : activeProposals.length > 0 ? (
            <div className="grid gap-6">
              {activeProposals.map(proposal => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  votingPower={votingPower}
                  onVote={() => {
                    fetchProposals();
                    if (address) fetchVotingPower();
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-base-100/50 rounded-2xl">
              <p className="text-base-content/60">No active proposals</p>
            </div>
          )}
        </div>

        {/* Past Proposals */}
        {pastProposals.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Past Proposals</h2>
            <div className="grid gap-6">
              {pastProposals.map(proposal => (
                <ProposalCard key={proposal.id} proposal={proposal} votingPower={votingPower} onVote={() => {}} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
