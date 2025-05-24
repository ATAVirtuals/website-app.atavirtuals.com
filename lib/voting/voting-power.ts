import { VotingPower } from "./types";
import { kv } from "@vercel/kv";
import { ethers } from "ethers";
import externalContracts from "~~/contracts/externalContracts";

const CACHE_TTL = 300; // 5 minutes

export async function getVotingPower(address: string, blockNumber?: number): Promise<VotingPower> {
  // Check cache first
  const cacheKey = `voting-power:${address}:${blockNumber || "latest"}`;
  const cached = await kv.get<VotingPower>(cacheKey);
  if (cached) return cached;

  // Get positions from contract
  const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
  const stakingContract = externalContracts[8453].stakedToken;
  const contract = new ethers.Contract(stakingContract.address, stakingContract.abi, provider);

  const numPositions = await contract.numPositions(address);
  const positions = await contract.getPositions(address, 0, numPositions);

  // Calculate voting power with multipliers
  let totalPower = 0n;
  const breakdown = [];

  for (const position of positions) {
    const multiplier = getMultiplier(position.numWeeks);
    const power = (position.amount * BigInt(multiplier)) / 10000n;
    totalPower += power;

    breakdown.push({
      amount: position.amount.toString(),
      weeks: position.numWeeks,
      multiplier: multiplier / 10000,
      power: power.toString(),
    });
  }

  const result = {
    totalPower: totalPower.toString(),
    breakdown,
    address,
    blockNumber: blockNumber || (await provider.getBlockNumber()),
  };

  // Cache result
  await kv.set(cacheKey, result, { ex: CACHE_TTL });

  return result;
}

function getMultiplier(weeks: number): number {
  if (weeks >= 12) return 20000; // 2.0x
  if (weeks >= 8) return 15000; // 1.5x
  if (weeks >= 4) return 12500; // 1.25x
  return 10000; // 1.0x (base)
}

// Clear cache when staking positions change
export async function clearVotingPowerCache(address: string) {
  const pattern = `voting-power:${address}:*`;
  const keys = await kv.keys(pattern);
  if (keys.length > 0) {
    await kv.del(...keys);
  }
}
