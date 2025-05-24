import { useReadContract } from "wagmi";
import externalContracts from "~~/contracts/externalContracts";

export const useGetTotalValueLocked = () => {
  const stakingContract = externalContracts[8453].stakedToken;

  // Read base token address from staking contract
  const { data: baseTokenAddress } = useReadContract({
    address: stakingContract.address,
    abi: stakingContract.abi,
    functionName: "baseToken",
    chainId: 8453,
  });

  // Get total value locked (balance of staking contract)
  const { data: totalValueLocked, ...rest } = useReadContract({
    address: baseTokenAddress,
    abi: [
      {
        name: "balanceOf",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
      },
    ],
    functionName: "balanceOf",
    args: baseTokenAddress ? [stakingContract.address] : undefined,
    chainId: 8453,
  });

  return { totalValueLocked, ...rest };
};
