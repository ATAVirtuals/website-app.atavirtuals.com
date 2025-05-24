import { NextRequest, NextResponse } from "next/server";
import { getVotingPower } from "~~/lib/voting/voting-power";

export async function GET(request: NextRequest, { params }: { params: { address: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const blockNumber = searchParams.get("block");

    const votingPower = await getVotingPower(params.address, blockNumber ? parseInt(blockNumber) : undefined);

    return NextResponse.json(votingPower);
  } catch (error) {
    console.error("Failed to get voting power:", error);
    return NextResponse.json({ error: "Failed to get voting power" }, { status: 500 });
  }
}
