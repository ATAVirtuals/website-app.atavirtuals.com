"use client";

import { useState } from "react";
import { useAccount, useSignTypedData } from "wagmi";
import { notification } from "~~/utils/scaffold-eth";

interface VoteButtonProps {
  proposalId: number;
  choice: number;
  onSuccess: () => void;
  disabled?: boolean;
}

export default function VoteButton({ proposalId, choice, onSuccess, disabled }: VoteButtonProps) {
  const { address } = useAccount();
  const [isVoting, setIsVoting] = useState(false);
  const { signTypedDataAsync } = useSignTypedData();

  async function handleVote() {
    if (!address) return;

    setIsVoting(true);

    try {
      // Create and sign vote message
      const message = {
        proposalId,
        voter: address,
        choice,
        timestamp: Math.floor(Date.now() / 1000),
      };

      const domain = {
        name: "ATA Voting",
        version: "1",
        chainId: 8453,
      };

      const types = {
        Vote: [
          { name: "proposalId", type: "uint256" },
          { name: "voter", type: "address" },
          { name: "choice", type: "uint256" },
          { name: "timestamp", type: "uint256" },
        ],
      };

      const signature = await signTypedDataAsync({
        domain,
        types,
        message,
        primaryType: "Vote",
      });

      // Submit vote
      const response = await fetch("/api/voting/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalId,
          voter: address,
          choice,
          signature,
          message,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit vote");
      }

      notification.success("Vote submitted successfully!");
      onSuccess();
    } catch (error: any) {
      console.error("Vote error:", error);
      if (error.message?.includes("User rejected") || error.message?.includes("User denied")) {
        notification.error("Vote cancelled");
      } else {
        notification.error(error.message || "Failed to submit vote");
      }
    } finally {
      setIsVoting(false);
    }
  }

  return (
    <button className="btn btn-primary btn-sm" onClick={handleVote} disabled={disabled || isVoting}>
      {isVoting ? (
        <>
          <span className="loading loading-spinner loading-sm"></span>
          Voting...
        </>
      ) : (
        "Submit Vote"
      )}
    </button>
  );
}
