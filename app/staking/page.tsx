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

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  gradient: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon: Icon, gradient }) => {
  return (
    <div className="rounded-xl bg-base-100 border border-base-300 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-xs text-base-content/60 uppercase tracking-wider mb-1">{title}</p>
          <p className="text-xl font-bold text-base-content">{value}</p>
          {subtitle && <p className="text-xs text-base-content/50 mt-0.5">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${gradient} p-2 flex-shrink-0`}>
          <Icon className="w-full h-full text-white" />
        </div>
      </div>
    </div>
  );
};

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
      <div className="min-h-screen p-4">
        <div className="container mx-auto max-w-7xl">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 rounded-full mb-4">
              <SparklesIcon className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-primary">Stake ATA • Earn Rewards</span>
            </div>
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              ATA Staking Platform
            </h1>
            <p className="text-xl text-base-content/70 max-w-2xl mx-auto">
              Lock your ATA tokens to earn rewards and participate in governance with enhanced voting power.
            </p>
          </div>

          {/* Platform Stats */}
          <div className="mb-12">
            <h3 className="text-lg font-semibold mb-4 text-center text-base-content/70">Platform Analytics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="col-span-2">
                <div className="bg-base-100 rounded-xl border border-base-300 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs text-base-content/60 uppercase tracking-wider mb-1">TOTAL VALUE LOCKED</p>
                      <p className="text-3xl font-bold text-base-content">
                        {totalValueLocked ? `${tvlPercentage}%` : "Loading..."}
                      </p>
                      <p className="text-sm text-base-content/50 mt-0.5">
                        {totalValueLocked
                          ? `${formatTokenAmount(totalValueLocked)} of 1,000,000,000 ATA`
                          : "of total supply"}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 p-3 flex-shrink-0">
                      <LockClosedIcon className="w-full h-full text-white" />
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-6">
                    <div className="flex justify-between text-xs text-base-content/60 mb-2">
                      <span>0%</span>
                      <span className="font-medium">Progress to 100% Staked</span>
                      <span>100%</span>
                    </div>
                    <div className="relative h-8 bg-base-300 rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-3"
                        style={{ width: `${totalValueLocked ? tvlPercentage : 0}%` }}
                      >
                        {parseFloat(tvlPercentage) > 10 && (
                          <span className="text-xs font-bold text-white">{tvlPercentage}%</span>
                        )}
                      </div>
                      {parseFloat(tvlPercentage) <= 10 && (
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-base-content/60">
                          {tvlPercentage}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <StatCard
                title="Network"
                value="Base Chain"
                subtitle="Ethereum L2"
                icon={ShieldCheckIcon}
                gradient="from-indigo-500 to-indigo-600"
              />
              <StatCard
                title="Lock Period"
                value={`${maxWeeks || 0} weeks`}
                subtitle="Default duration"
                icon={ClockIcon}
                gradient="from-indigo-500 to-indigo-600"
              />
            </div>
          </div>

          {/* Connect Wallet Card */}
          <div className="max-w-md mx-auto">
            <div className="bg-base-200/50 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-base-300">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/20 mb-6">
                  <WalletIcon className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-3xl font-bold mb-4">Connect Your Wallet</h2>
                <p className="text-base-content/70 mb-8">
                  Connect your wallet to stake ATA tokens and start earning rewards.
                </p>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3 p-4 bg-base-300/50 rounded-xl">
                    <ShieldCheckIcon className="w-6 h-6 text-primary" />
                    <span className="text-sm">Secure & Non-custodial</span>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-base-300/50 rounded-xl">
                    <ArrowTrendingUpIcon className="w-6 h-6 text-primary" />
                    <span className="text-sm">Earn rewards through staking</span>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-base-300/50 rounded-xl">
                    <LockClosedIcon className="w-6 h-6 text-primary" />
                    <span className="text-sm">Flexible lock periods</span>
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
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 rounded-full mb-4">
          <SparklesIcon className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium text-primary">Stake ATA • Earn Rewards</span>
        </div>
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          ATA Staking Platform
        </h1>
        <p className="text-xl text-base-content/70 max-w-2xl mx-auto">
          Lock your ATA tokens to earn rewards and participate in governance with enhanced voting power.
        </p>
      </div>

      {/* Stats Cards - Show both personal and global stats when connected */}
      <div className="mb-8">
        {/* Platform Stats */}
        <h3 className="text-lg font-semibold mb-4 text-base-content/70">Platform Analytics</h3>

        {/* TVL Progress Bar Card */}
        <div className="bg-base-100 rounded-xl border border-base-300 p-6 hover:shadow-md transition-shadow mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-base-content/60 uppercase tracking-wider mb-1">TOTAL VALUE LOCKED</p>
              <p className="text-3xl font-bold text-base-content">
                {totalValueLocked ? `${tvlPercentage}%` : "Loading..."}
              </p>
              <p className="text-sm text-base-content/50 mt-0.5">
                {totalValueLocked ? `${formatTokenAmount(totalValueLocked)} of 1,000,000,000 ATA` : "of total supply"}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 p-3 flex-shrink-0">
              <LockClosedIcon className="w-full h-full text-white" />
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between text-xs text-base-content/60 mb-2">
              <span>0%</span>
              <span className="font-medium">Progress to 100% Staked</span>
              <span>100%</span>
            </div>
            <div className="relative h-8 bg-base-300 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-3"
                style={{ width: `${totalValueLocked ? tvlPercentage : 0}%` }}
              >
                {parseFloat(tvlPercentage) > 10 && (
                  <span className="text-xs font-bold text-white">{tvlPercentage}%</span>
                )}
              </div>
              {parseFloat(tvlPercentage) <= 10 && (
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-base-content/60">
                  {tvlPercentage}%
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard
            title="Network"
            value="Base Chain"
            subtitle="Ethereum L2"
            icon={ShieldCheckIcon}
            gradient="from-blue-500 to-blue-600"
          />
          <StatCard
            title="Lock Period"
            value={`${maxWeeks || 0} weeks`}
            subtitle="Default staking duration"
            icon={ClockIcon}
            gradient="from-green-500 to-green-600"
          />
        </div>

        {/* Personal Stats */}
        <h3 className="text-lg font-semibold mb-4 text-base-content/70">Your Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Wallet Balance"
            value={tokenBalance ? `${formatTokenAmount(tokenBalance, 2)} ATA` : "0 ATA"}
            subtitle="Available to stake"
            icon={WalletIcon}
            gradient="from-slate-600 to-slate-700"
          />
          <StatCard
            title="Your Staked"
            value={totalStakedAmount ? `${formatTokenAmount(totalStakedAmount, 2)} ATA` : "0 ATA"}
            subtitle={`${positions.length} active positions`}
            icon={BanknotesIcon}
            gradient="from-slate-600 to-slate-700"
          />
          <StatCard
            title="Voting Power"
            value={totalStakedAmount && totalValueLocked ? `${votingPowerPercentage}%` : "0%"}
            subtitle={
              totalStakedAmount
                ? `${formatTokenAmount(totalStakedAmount, 2)} ATA of total`
                : "Your share of total staked"
            }
            icon={ChartBarIcon}
            gradient="from-slate-600 to-slate-700"
          />
          <StatCard
            title="Active Positions"
            value={positions.length.toString()}
            subtitle="Your staking positions"
            icon={LockClosedIcon}
            gradient="from-slate-600 to-slate-700"
          />
        </div>
      </div>

      {/* Check if user has any unlocked positions */}
      {(() => {
        const unlockedPositions = positions.filter(p => isPositionUnlocked(p));
        const totalUnlocked = unlockedPositions.reduce((sum, p) => sum + p.amount, 0n);

        return totalUnlocked > 0n ? (
          <div className="bg-warning/20 border border-warning/50 rounded-xl p-4 mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="font-semibold text-warning-content">Unstake Available</p>
                <p className="text-sm text-base-content/70">
                  You have {formatTokenAmount(totalUnlocked, 2)} ATA ready to unstake
                </p>
              </div>
              <button className="btn btn-warning btn-sm" onClick={() => setActiveTab("positions")}>
                View Positions
              </button>
            </div>
          </div>
        ) : null;
      })()}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("stake")}
          className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
            activeTab === "stake" ? "bg-primary text-primary-content" : "bg-base-200 hover:bg-base-300"
          }`}
        >
          Stake
        </button>
        <button
          onClick={() => setActiveTab("positions")}
          className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
            activeTab === "positions" ? "bg-primary text-primary-content" : "bg-base-200 hover:bg-base-300"
          }`}
        >
          Positions ({positions.length})
        </button>
      </div>

      {/* Main Content */}
      {activeTab === "stake" ? (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Staking Form */}
          <div className="lg:col-span-2">
            <div className="bg-base-200/50 rounded-2xl p-6 border border-base-300">
              <h2 className="text-xl font-bold mb-4">Stake ATA</h2>

              <div className="space-y-4">
                <div>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0.0"
                      className="input input-bordered w-full text-xl font-bold pr-16 h-14"
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
                      <span className="font-medium text-base-content/70">ATA</span>
                    </div>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-xs text-base-content/60">
                      Balance: {tokenBalance ? formatTokenAmount(tokenBalance, 2) : "0"} ATA
                    </span>
                    <button
                      className="text-xs text-primary hover:underline"
                      onClick={() => setStakeAmount(tokenBalance ? formatEther(tokenBalance) : "0")}
                    >
                      Use Max
                    </button>
                  </div>
                </div>

                <div className="text-sm text-base-content/60">Tokens will be locked for {maxWeeks || 0} weeks</div>

                <button
                  className="btn btn-primary w-full"
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
            <div className="bg-base-200/50 rounded-2xl p-5 border border-base-300">
              <h3 className="font-semibold mb-3 text-sm">Quick Info</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-success flex-shrink-0" />
                  <span>Earn rewards & governance power</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-success flex-shrink-0" />
                  <span>{maxWeeks || 0} week lock period</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-success flex-shrink-0" />
                  <span>Unstake after lock expires</span>
                </li>
              </ul>

              <div className="mt-4 pt-4 border-t border-base-300">
                <p className="text-xs text-base-content/60 mb-2">Staking Contract</p>
                <p className="text-xs font-mono break-all">
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
            <div className="bg-base-200/50 rounded-2xl p-8 text-center">
              <LockClosedIcon className="w-12 h-12 text-base-content/20 mx-auto mb-3" />
              <p className="text-base-content/60">No staking positions yet</p>
              <button className="btn btn-primary btn-sm mt-4" onClick={() => setActiveTab("stake")}>
                Start Staking
              </button>
            </div>
          ) : (
            <>
              {/* Mobile-friendly card layout */}
              <div className="space-y-3">
                {positions.map(position => {
                  const isUnlocked = isPositionUnlocked(position);
                  return (
                    <div key={position.id.toString()} className="bg-base-200/50 rounded-xl p-4 border border-base-300">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-2xl font-bold">{formatTokenAmount(position.amount, 2)} ATA</p>
                          <p className="text-sm text-base-content/60">Position #{position.id.toString()}</p>
                        </div>
                        <div className="text-right">
                          {isUnlocked ? (
                            <span className="badge badge-success badge-sm">Unlocked</span>
                          ) : (
                            <span className="badge badge-warning badge-sm">Locked</span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                        <div>
                          <p className="text-base-content/60">Time Remaining</p>
                          <p className="font-medium">{getTimeRemaining(position.end)}</p>
                        </div>
                        <div>
                          <p className="text-base-content/60">Unlock Date</p>
                          <p className="font-medium">{new Date(Number(position.end) * 1000).toLocaleDateString()}</p>
                        </div>
                      </div>

                      {isUnlocked && (
                        <button className="btn btn-primary btn-block" onClick={() => handleWithdraw(position.id)}>
                          Unstake {formatTokenAmount(position.amount, 2)} ATA
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
