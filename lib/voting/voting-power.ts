import { VotingPower } from "./types";
import { ethers } from "ethers";
import externalContracts from "~~/contracts/externalContracts";

const CACHE_TTL = 300; // 5 minutes

// Conditionally import KV only if available
let kv: any = null;
if (process.env.KV_URL) {
  import("@vercel/kv")
    .then(module => {
      kv = module.kv;
    })
    .catch(() => {
      console.log("KV not available, running without cache");
    });
}

export async function getVotingPower(address: string, blockNumber?: number): Promise<VotingPower> {
  // Check cache first if KV is available
  const cacheKey = `voting-power:${address}:${blockNumber || "latest"}`;
  if (kv) {
    try {
      const cached = await kv.get(cacheKey);
      if (cached) return cached as VotingPower;
    } catch (e) {
      console.log("Cache read failed:", e);
    }
  }

  try {
    // Get staked amount from contract (same as staking page)
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    const stakingContract = externalContracts[8453].stakedToken;
    const contract = new ethers.Contract(stakingContract.address, stakingContract.abi, provider);

    // Get total staked amount for user (same as staking page)
    const stakedAmount = await contract.stakedAmountOf(address);

    const result = {
      totalPower: stakedAmount.toString(),
      breakdown: [], // We can still fetch positions if needed for display
      address,
      blockNumber: blockNumber || (await provider.getBlockNumber()),
    };

    // Cache result if KV is available
    if (kv) {
      try {
        await kv.set(cacheKey, result, { ex: CACHE_TTL });
      } catch (e) {
        console.log("Cache write failed:", e);
      }
    }

    return result;
  } catch (error) {
    console.error("Failed to get voting power from contract:", error);
    // Return default voting power on error
    return {
      totalPower: "0",
      breakdown: [],
      address,
      blockNumber: blockNumber || 0,
    };
  }
}

// Clear cache when staking positions change
export async function clearVotingPowerCache(address: string) {
  const pattern = `voting-power:${address}:*`;
  const keys = await kv.keys(pattern);
  if (keys.length > 0) {
    await kv.del(...keys);
  }
}
