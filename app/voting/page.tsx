"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { PlusIcon } from "@heroicons/react/24/outline";
import ProposalCard from "~~/components/voting/ProposalCard";
import VotingPowerDisplay from "~~/components/voting/VotingPowerDisplay";
import { useGetTotalValueLocked } from "~~/hooks/scaffold-eth";
import { ProposalWithResults, VotingPower } from "~~/lib/voting/types";

const ADMIN_ADDRESS = "0xF5512860735795994bB45e4DdeBE7686241167aD";

export default function VotingPage() {
  const { address, isConnected } = useAccount();
  const [proposals, setProposals] = useState<ProposalWithResults[]>([]);
  const [votingPower, setVotingPower] = useState<VotingPower | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const { totalValueLocked } = useGetTotalValueLocked();

  const isAdmin = address?.toLowerCase() === ADMIN_ADDRESS.toLowerCase();

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
        {isConnected && votingPower && (
          <VotingPowerDisplay power={votingPower} totalValueLocked={totalValueLocked} className="mb-8" />
        )}

        {/* Active Proposals */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Active Proposals</h2>
            {isAdmin && (
              <button
                className="btn btn-primary btn-sm gap-2"
                onClick={() => setShowCreateModal(true)}
              >
                <PlusIcon className="w-4 h-4" />
                Create Proposal
              </button>
            )}
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

    {/* Create Proposal Modal */}
    {showCreateModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Create New Proposal</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const title = formData.get("title") as string;
                const description = formData.get("description") as string;
                const options = formData.get("options") as string;
                const days = formData.get("days") as string;

                if (!title || !description || !options || !days) {
                  alert("Please fill all fields");
                  return;
                }

                setCreating(true);
                try {
                  const res = await fetch("/api/voting/proposals", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      title,
                      description,
                      options: options.split("\n").map(o => o.trim()).filter(o => o),
                      votingDays: parseInt(days),
                      creator: address,
                    }),
                  });

                  if (res.ok) {
                    setShowCreateModal(false);
                    fetchProposals();
                  } else {
                    const error = await res.text();
                    alert(`Failed to create proposal: ${error}`);
                  }
                } catch (error) {
                  alert("Failed to create proposal");
                } finally {
                  setCreating(false);
                }
              }}
            >
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Title</span>
                </label>
                <input
                  type="text"
                  name="title"
                  placeholder="Proposal title"
                  className="input input-bordered"
                  required
                />
              </div>

              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Description</span>
                </label>
                <textarea
                  name="description"
                  placeholder="Describe your proposal..."
                  className="textarea textarea-bordered h-24"
                  required
                />
              </div>

              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Options (one per line)</span>
                </label>
                <textarea
                  name="options"
                  placeholder="Yes&#10;No&#10;Abstain"
                  className="textarea textarea-bordered h-20"
                  required
                />
              </div>

              <div className="form-control mb-6">
                <label className="label">
                  <span className="label-text">Voting Period (days)</span>
                </label>
                <input
                  type="number"
                  name="days"
                  placeholder="7"
                  min="1"
                  max="30"
                  className="input input-bordered"
                  required
                />
              </div>

              <div className="modal-action">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creating}
                >
                  {creating ? <span className="loading loading-spinner"></span> : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
