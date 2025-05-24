import { VoteMessage } from "./types";
import { ethers } from "ethers";

const DOMAIN = {
  name: "ATA Voting",
  version: "1",
  chainId: 8453,
};

const TYPES = {
  Vote: [
    { name: "proposalId", type: "uint256" },
    { name: "voter", type: "address" },
    { name: "choice", type: "uint256" },
    { name: "timestamp", type: "uint256" },
  ],
};

export async function verifySignature(
  message: VoteMessage,
  signature: string,
  expectedAddress: string,
): Promise<boolean> {
  try {
    const recoveredAddress = ethers.verifyTypedData(DOMAIN, TYPES, message, signature);

    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch (error) {
    console.error("Signature verification failed:", error);
    return false;
  }
}

export function createVoteMessage(proposalId: number, voter: string, choice: number): VoteMessage {
  return {
    proposalId,
    voter,
    choice,
    timestamp: Math.floor(Date.now() / 1000),
  };
}

// For use in frontend
export async function signVote(
  signer: ethers.Signer,
  proposalId: number,
  choice: number,
): Promise<{ message: VoteMessage; signature: string }> {
  const address = await signer.getAddress();
  const message = createVoteMessage(proposalId, address, choice);

  const signature = await signer.signTypedData(DOMAIN, TYPES, message);

  return { message, signature };
}
