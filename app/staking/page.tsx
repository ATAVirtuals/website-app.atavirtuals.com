"use client";

import { useCallback, useEffect, useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import {
  ArrowTrendingUpIcon,
  BanknotesIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  SparklesIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import externalContracts from "~~/contracts/externalContracts";
import { notification } from "~~/utils/scaffold-eth";

interface Lock {
  amount: bigint;
  start: bigint;
  end: bigint;
  numWeeks: number;
  autoRenew: boolean;
  id: bigint;
}

export default function StakingPage() {
  const { address, isConnected } = useAccount();
  const [stakeAmount, setStakeAmount] = useState("");
  const [positions, setPositions] = useState<Lock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<bigint>(0n);
  const [activeTab, setActiveTab] = useState<"stake" | "positions">("stake");

  const stakingContract = externalContracts[8453].stakedToken;

  // Read base token address
  const { data: baseTokenAddress } = useReadContract({
    address: stakingContract.address,
    abi: stakingContract.abi,
    functionName: "baseToken",
    chainId: 8453,
  });

  // Get total staked (TVL) - ATA tokens held by the staking contract
  const { data: totalValueLocked } = useReadContract({
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

  // Read max weeks
  const { data: maxWeeks } = useReadContract({
    address: stakingContract.address,
    abi: stakingContract.abi,
    functionName: "maxWeeks",
    chainId: 8453,
  });

  // Read number of positions
  const { data: numPositions } = useReadContract({
    address: stakingContract.address,
    abi: stakingContract.abi,
    functionName: "numPositions",
    args: address ? [address] : undefined,
    chainId: 8453,
  });

  // Read total staked amount for user
  const { data: totalStakedAmount } = useReadContract({
    address: stakingContract.address,
    abi: stakingContract.abi,
    functionName: "stakedAmountOf",
    args: address ? [address] : undefined,
    chainId: 8453,
  });

  // Get positions
  const { data: userPositions } = useReadContract({
    address: stakingContract.address,
    abi: stakingContract.abi,
    functionName: "getPositions",
    args: address && numPositions ? [address, 0n, numPositions] : undefined,
    chainId: 8453,
  });

  // Read token balance
  const { data: tokenBalanceData } = useReadContract({
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
    args: address ? [address] : undefined,
    chainId: 8453,
  });

  // Read token allowance
  const { data: tokenAllowanceData } = useReadContract({
    address: baseTokenAddress,
    abi: [
      {
        name: "allowance",
        type: "function",
        stateMutability: "view",
        inputs: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
        ],
        outputs: [{ name: "", type: "uint256" }],
      },
    ],
    functionName: "allowance",
    args: address ? [address, stakingContract.address] : undefined,
    chainId: 8453,
  });

  // Write functions with status tracking
  const {
    writeContract: approveToken,
    data: approveData,
    isPending: isApproving,
    isSuccess: isApproveSuccess,
    error: approveError,
  } = useWriteContract();

  const {
    writeContract: stake,
    data: stakeData,
    isPending: isStaking,
    isSuccess: isStakeSuccess,
    error: stakeError,
  } = useWriteContract();

  const { writeContract: withdraw } = useWriteContract();

  useEffect(() => {
    if (userPositions) {
      setPositions(userPositions as Lock[]);
    }
  }, [userPositions]);

  useEffect(() => {
    if (tokenBalanceData) {
      setTokenBalance(tokenBalanceData as bigint);
    }
  }, [tokenBalanceData]);

  // Check if user needs to approve tokens
  const needsApproval = stakeAmount && parseEther(stakeAmount || "0") > (tokenAllowanceData || 0n);

  const handleStake = useCallback(() => {
    if (!stakeAmount) return;

    const amount = parseEther(stakeAmount);

    stake({
      address: stakingContract.address,
      abi: stakingContract.abi,
      functionName: "stake",
      args: [amount],
      chainId: 8453,
    });
  }, [stakeAmount, stake, stakingContract.address, stakingContract.abi]);

  const handleApprove = () => {
    if (!baseTokenAddress || !stakeAmount) return;

    const amount = parseEther(stakeAmount);

    approveToken({
      address: baseTokenAddress,
      abi: [
        {
          name: "approve",
          type: "function",
          stateMutability: "nonpayable",
          inputs: [
            { name: "spender", type: "address" },
            { name: "amount", type: "uint256" },
          ],
          outputs: [{ name: "", type: "bool" }],
        },
      ],
      functionName: "approve",
      args: [stakingContract.address, amount],
      chainId: 8453,
    });
  };

  // Watch for approval transaction status
  useEffect(() => {
    if (isApproveSuccess && approveData) {
      notification.success("Approval confirmed! Preparing to stake...");
      // Wait a moment for the approval to be processed on-chain
      setTimeout(() => {
        if (stakeAmount) {
          handleStake();
        }
      }, 1500);
    }
    if (approveError) {
      console.error("Approval error:", approveError);
      if (approveError.message?.includes("User rejected") || approveError.message?.includes("User denied")) {
        notification.error("Transaction cancelled");
      } else {
        notification.error("Failed to approve tokens");
      }
    }
  }, [isApproveSuccess, approveData, approveError, stakeAmount, handleStake]);

  // Watch for stake transaction status
  useEffect(() => {
    if (isStakeSuccess && stakeData) {
      notification.success("Stake transaction submitted!");
      setStakeAmount("");

      // Refresh the page to update balances
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    }
    if (stakeError) {
      console.error("Stake error:", stakeError);
      if (stakeError.message?.includes("User rejected") || stakeError.message?.includes("User denied")) {
        notification.error("Transaction cancelled");
      } else {
        notification.error("Failed to stake tokens");
      }
    }
  }, [isStakeSuccess, stakeData, stakeError]);

  const handleWithdraw = async (id: bigint) => {
    try {
      setIsLoading(true);

      await withdraw({
        address: stakingContract.address,
        abi: stakingContract.abi,
        functionName: "withdraw",
        args: [id],
        chainId: 8453,
      });

      notification.success("Withdrawal submitted!");

      // Refresh after withdrawal
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (error) {
      console.error("Withdrawal error:", error);
      notification.error("Failed to withdraw");
    } finally {
      setIsLoading(false);
    }
  };

  const isPositionUnlocked = (position: Lock) => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    return now >= position.end;
  };

  // Format numbers with commas for better readability
  const formatNumberWithCommas = (value: string) => {
    const parts = value.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  };

  const formatTokenAmount = (amount: bigint, decimals: number = 0) => {
    const formatted = formatEther(amount);
    const [whole, decimal] = formatted.split(".");

    // If decimals is 0, just return the whole number
    if (decimals === 0) {
      return formatNumberWithCommas(whole);
    }

    const truncatedDecimal = decimal ? decimal.slice(0, decimals) : "";
    const formattedWhole = formatNumberWithCommas(whole);
    return truncatedDecimal ? `${formattedWhole}.${truncatedDecimal}` : formattedWhole;
  };

  const getTimeRemaining = (endTime: bigint) => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    if (now >= endTime) return "Unlocked";

    const diff = Number(endTime - now);
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);

    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  // Calculate TVL percentage (1 billion total supply)
  const TOTAL_SUPPLY = parseEther("1000000000"); // 1 billion ATA
  const tvlPercentage = totalValueLocked ? ((Number(totalValueLocked) / Number(TOTAL_SUPPLY)) * 100).toFixed(2) : "0";

  // Calculate voting power percentage (user's stake vs total staked)
  const votingPowerPercentage =
    totalValueLocked && totalStakedAmount
      ? ((Number(totalStakedAmount) / Number(totalValueLocked)) * 100).toFixed(4)
      : "0";

  // If wallet not connected, show connection prompt with global stats
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-base-100 to-base-200">
        <div className="container mx-auto max-w-6xl px-4 py-20">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-xl rounded-full mb-6">
              <SparklesIcon className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Stake • Earn • Govern</span>
            </div>
            <h1 className="text-6xl md:text-7xl font-bold mb-6 tracking-tight">ATA Staking</h1>
            <p className="text-xl text-base-content/60 max-w-2xl mx-auto leading-relaxed">
              Lock your ATA tokens to earn rewards and participate in governance
            </p>
          </div>

          {/* Platform Stats */}
          <div className="mb-16">
            <div className="bg-base-100/50 backdrop-blur-xl rounded-3xl border border-base-300/50 p-8 md:p-10 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm text-base-content/60 mb-2">Total Value Locked</p>
                  <p className="text-4xl md:text-5xl font-bold">
                    {totalValueLocked ? formatTokenAmount(totalValueLocked) : "0"}
                    <span className="text-2xl md:text-3xl font-normal text-base-content/60 ml-2">ATA</span>
                  </p>
                </div>
                <div className="hidden md:block">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 backdrop-blur-xl p-4">
                    <LockClosedIcon className="w-full h-full text-primary" />
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-sm text-base-content/60 mb-3">
                  <span>{tvlPercentage}% of Total Supply</span>
                  <span>1B ATA</span>
                </div>
                <div className="relative h-3 bg-base-300/50 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${totalValueLocked ? tvlPercentage : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Connect Wallet Card */}
          <div className="max-w-md mx-auto">
            <div className="bg-base-100/50 backdrop-blur-xl rounded-3xl p-8 border border-base-300/50 shadow-xl">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 backdrop-blur-xl mb-6">
                  <WalletIcon className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-4">Connect Wallet</h2>
                <p className="text-base-content/60 mb-8">Connect your wallet to start staking ATA tokens</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-4 bg-base-200/50 rounded-2xl">
                    <ShieldCheckIcon className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-sm text-left">Secure & Non-custodial</span>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-base-200/50 rounded-2xl">
                    <ArrowTrendingUpIcon className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-sm text-left">Earn staking rewards</span>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-base-200/50 rounded-2xl">
                    <LockClosedIcon className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-sm text-left">2 week lock periods</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-base-100 to-base-200">
      <div className="container mx-auto max-w-6xl px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-xl rounded-full mb-6">
            <SparklesIcon className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Stake • Earn • Govern</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4 tracking-tight">ATA Staking</h1>
          <p className="text-lg text-base-content/60 max-w-xl mx-auto">
            Lock your tokens to earn rewards and voting power
          </p>
        </div>

        {/* TVL Progress Bar */}
        <div className="bg-base-100/50 backdrop-blur-xl rounded-2xl border border-base-300/50 p-6 shadow-lg mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-base-content/60 mb-2">Total Value Locked</p>
              <p className="text-3xl md:text-4xl font-bold">
                {totalValueLocked ? formatTokenAmount(totalValueLocked) : "0"}
                <span className="text-xl md:text-2xl font-normal text-base-content/60 ml-2">ATA</span>
              </p>
            </div>
            <div className="hidden md:block">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 backdrop-blur-xl p-3">
                <LockClosedIcon className="w-full h-full text-primary" />
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm text-base-content/60 mb-3">
              <span>{tvlPercentage}% of Total Supply</span>
              <span>1B ATA</span>
            </div>
            <div className="relative h-3 bg-base-300/50 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${totalValueLocked ? tvlPercentage : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* User Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Your Stake Card */}
          <div className="bg-base-100/50 backdrop-blur-xl rounded-2xl border border-base-300/50 p-6 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-base-content/60">Your Stake</p>
              <BanknotesIcon className="w-5 h-5 text-primary/60" />
            </div>
            <p className="text-2xl font-bold mb-1">
              {totalStakedAmount ? formatTokenAmount(totalStakedAmount, 2) : "0"}
              <span className="text-base font-normal text-base-content/60 ml-1">ATA</span>
            </p>
            <p className="text-xs text-base-content/60">{positions.length} positions</p>
          </div>

          {/* Voting Power Card */}
          <div className="bg-base-100/50 backdrop-blur-xl rounded-2xl border border-base-300/50 p-6 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-base-content/60">Voting Power</p>
              <ChartBarIcon className="w-5 h-5 text-primary/60" />
            </div>
            <p className="text-2xl font-bold mb-1">
              {votingPowerPercentage}
              <span className="text-base font-normal text-base-content/60 ml-1">%</span>
            </p>
            <p className="text-xs text-base-content/60">of total staked</p>
          </div>
        </div>

        {/* Check if user has any unlocked positions */}
        {(() => {
          const unlockedPositions = positions.filter(p => isPositionUnlocked(p));
          const totalUnlocked = unlockedPositions.reduce((sum, p) => sum + p.amount, 0n);

          return totalUnlocked > 0n ? (
            <div className="bg-warning/10 backdrop-blur-xl border border-warning/30 rounded-2xl p-4 mb-8">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <ClockIcon className="w-5 h-5 text-warning" />
                  <div>
                    <p className="font-semibold text-warning">Unstake Available</p>
                    <p className="text-sm text-base-content/70">
                      {formatTokenAmount(totalUnlocked, 2)} ATA ready to withdraw
                    </p>
                  </div>
                </div>
                <button className="btn btn-warning btn-sm rounded-full px-6" onClick={() => setActiveTab("positions")}>
                  View Positions
                </button>
              </div>
            </div>
          ) : null;
        })()}

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-base-200/50 backdrop-blur-xl rounded-full w-fit mb-8">
          <button
            onClick={() => setActiveTab("stake")}
            className={`px-6 py-2.5 rounded-full font-medium transition-all text-sm ${
              activeTab === "stake"
                ? "bg-primary text-primary-content shadow-lg"
                : "text-base-content/60 hover:text-base-content"
            }`}
          >
            Stake
          </button>
          <button
            onClick={() => setActiveTab("positions")}
            className={`px-6 py-2.5 rounded-full font-medium transition-all text-sm ${
              activeTab === "positions"
                ? "bg-primary text-primary-content shadow-lg"
                : "text-base-content/60 hover:text-base-content"
            }`}
          >
            Positions ({positions.length})
          </button>
        </div>

        {/* Main Content */}
        {activeTab === "stake" ? (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Staking Form */}
            <div className="lg:col-span-2">
              <div className="bg-base-100/50 backdrop-blur-xl rounded-3xl border border-base-300/50 p-6 md:p-8 shadow-xl">
                <h2 className="text-2xl font-bold mb-6">Stake ATA</h2>

                <div className="space-y-6">
                  <div>
                    <label className="text-sm text-base-content/60 mb-2 block">Amount</label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="0.0"
                        className="input input-bordered w-full text-3xl font-bold bg-base-200/50 border-base-300/50 h-16 pr-20"
                        value={stakeAmount}
                        onChange={e => {
                          const inputValue = e.target.value;

                          // Allow empty input
                          if (!inputValue) {
                            setStakeAmount("");
                            return;
                          }

                          // Allow typing decimal point
                          if (inputValue.endsWith(".") && inputValue.split(".").length === 2) {
                            setStakeAmount(inputValue);
                            return;
                          }

                          try {
                            const numValue = parseFloat(inputValue);

                            // If not a valid number, don't update
                            if (isNaN(numValue)) {
                              return;
                            }

                            // If balance is defined (even if 0), validate against it
                            if (tokenBalance !== undefined) {
                              const maxBalance = parseFloat(formatEther(tokenBalance));

                              // If user types more than their balance, auto-correct to max
                              if (numValue > maxBalance) {
                                // If balance is 0, set to "0" instead of "0."
                                setStakeAmount(maxBalance === 0 ? "0" : maxBalance.toString());
                              } else {
                                setStakeAmount(inputValue);
                              }
                            } else {
                              // No balance data yet, just allow the input
                              setStakeAmount(inputValue);
                            }
                          } catch (error) {
                            console.error("Validation error:", error);
                            setStakeAmount(inputValue);
                          }
                        }}
                        disabled={isLoading}
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <span className="text-xl font-medium text-base-content/70">ATA</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-sm text-base-content/60">
                        Balance: {tokenBalance ? formatTokenAmount(tokenBalance, 2) : "0"} ATA
                      </span>
                      <button
                        className="text-sm text-primary hover:text-primary-focus transition-colors"
                        onClick={() => setStakeAmount(tokenBalance ? formatEther(tokenBalance) : "0")}
                      >
                        Use Max
                      </button>
                    </div>
                  </div>

                  <div className="bg-base-200/50 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-sm">
                      <ClockIcon className="w-4 h-4 text-base-content/60" />
                      <span className="text-base-content/60">Lock period:</span>
                      <span className="font-medium">{maxWeeks || 0} weeks</span>
                    </div>
                  </div>

                  <button
                    className="btn btn-primary w-full h-14 text-lg rounded-2xl"
                    onClick={needsApproval ? handleApprove : handleStake}
                    disabled={
                      isApproving ||
                      isStaking ||
                      !address ||
                      !stakeAmount ||
                      parseEther(stakeAmount || "0") > tokenBalance ||
                      tokenBalance === 0n
                    }
                  >
                    {isApproving ? (
                      <span className="loading loading-spinner"></span>
                    ) : isStaking ? (
                      <span className="loading loading-spinner"></span>
                    ) : tokenBalance === 0n ? (
                      <>No ATA Balance</>
                    ) : (
                      <>Stake ATA</>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Info Panel */}
            <div>
              <div className="bg-base-100/50 backdrop-blur-xl rounded-3xl border border-base-300/50 p-6 shadow-xl">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <SparklesIcon className="w-5 h-5 text-primary" />
                  Staking Benefits
                </h3>
                <div className="space-y-4">
                  <div className="pl-7">
                    <p className="font-medium text-base relative">
                      <CheckCircleIcon className="w-5 h-5 text-success absolute -left-7 top-0.5" />
                      Earn Rewards
                    </p>
                    <p className="text-sm text-base-content/60 mt-1">Get staking rewards automatically</p>
                  </div>
                  <div className="pl-7">
                    <p className="font-medium text-base relative">
                      <CheckCircleIcon className="w-5 h-5 text-success absolute -left-7 top-0.5" />
                      Governance Power
                    </p>
                    <p className="text-sm text-base-content/60 mt-1">Participate in protocol decisions</p>
                  </div>
                  <div className="pl-7">
                    <p className="font-medium text-base relative">
                      <CheckCircleIcon className="w-5 h-5 text-success absolute -left-7 top-0.5" />
                      {maxWeeks || 0} Week Lock
                    </p>
                    <p className="text-sm text-base-content/60 mt-1">Unlock after maturity period</p>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-base-300/50">
                  <p className="text-xs text-base-content/60 mb-2">Staking Contract</p>
                  <p className="text-xs font-mono text-base-content/80 break-all">
                    {stakingContract.address.slice(0, 6)}...{stakingContract.address.slice(-4)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Positions Tab */
          <div className="space-y-4">
            {positions.length === 0 ? (
              <div className="bg-base-100/50 backdrop-blur-xl rounded-3xl border border-base-300/50 p-12 text-center shadow-xl">
                <LockClosedIcon className="w-16 h-16 text-base-content/20 mx-auto mb-4" />
                <p className="text-lg text-base-content/60 mb-6">No staking positions yet</p>
                <button className="btn btn-primary rounded-full px-8" onClick={() => setActiveTab("stake")}>
                  Start Staking
                </button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {positions.map(position => {
                  const isUnlocked = isPositionUnlocked(position);
                  return (
                    <div
                      key={position.id.toString()}
                      className="bg-base-100/50 backdrop-blur-xl rounded-2xl border border-base-300/50 p-6 shadow-lg hover:shadow-xl transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-3xl font-bold mb-1">
                            {formatTokenAmount(position.amount, 2)}
                            <span className="text-lg font-normal text-base-content/60 ml-1">ATA</span>
                          </p>
                          <p className="text-sm text-base-content/60">Position #{position.id.toString()}</p>
                        </div>
                        <div>
                          {isUnlocked ? (
                            <span className="badge badge-success badge-sm">Unlocked</span>
                          ) : (
                            <span className="badge badge-warning badge-sm">Locked</span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3 mb-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-base-content/60">Time Remaining</span>
                          <span className="text-sm font-medium">{getTimeRemaining(position.end)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-base-content/60">Unlock Date</span>
                          <span className="text-sm font-medium">
                            {new Date(Number(position.end) * 1000).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {isUnlocked && (
                        <button
                          className="btn btn-primary btn-block rounded-xl"
                          onClick={() => handleWithdraw(position.id)}
                          disabled={isLoading}
                        >
                          Unstake {formatTokenAmount(position.amount, 2)} ATA
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
