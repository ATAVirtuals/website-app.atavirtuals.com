import { NextRequest, NextResponse } from "next/server";
import { getVotingPower } from "~~/lib/voting/voting-power";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    // Return default voting power if KV is not set up
    if (!process.env.KV_URL) {
      return NextResponse.json({
        totalPower: "0",
        breakdown: [],
        address: (await params).address,
        blockNumber: 0
      });
    }

    const { address } = await params;
    const { searchParams } = new URL(request.url);
    const blockNumber = searchParams.get("block");

    const votingPower = await getVotingPower(
      address,
      blockNumber ? parseInt(blockNumber) : undefined
    );

    return NextResponse.json(votingPower);
  } catch (error) {
    console.error("Failed to get voting power:", error);
    // Return default voting power on error
    return NextResponse.json({
      totalPower: "0",
      breakdown: [],
      address: (await params).address,
      blockNumber: 0
    });
  }
}
