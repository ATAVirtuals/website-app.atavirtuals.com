import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getProposal } from "~~/lib/voting/database";
import { verifySignature } from "~~/lib/voting/signature";
import { getVotingPower } from "~~/lib/voting/voting-power";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { proposalId, voter, choice, signature, message } = body;

    // Verify signature
    const isValid = await verifySignature(message, signature, voter);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Get proposal to check if active
    const proposal = await getProposal(proposalId);

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const now = new Date();
    if (now < new Date(proposal.voting_start)) {
      return NextResponse.json({ error: "Voting has not started" }, { status: 400 });
    }

    if (now > new Date(proposal.voting_end)) {
      return NextResponse.json({ error: "Voting has ended" }, { status: 400 });
    }

    // Validate choice
    if (choice < 0 || choice >= proposal.options.length) {
      return NextResponse.json({ error: "Invalid choice" }, { status: 400 });
    }

    // Get voting power at snapshot block
    const votingPower = await getVotingPower(voter, proposal.snapshot_block);

    if (votingPower.totalPower === "0") {
      return NextResponse.json({ error: "No voting power at snapshot" }, { status: 400 });
    }

    // Record vote (upsert to allow changing vote)
    await sql`
      INSERT INTO votes (proposal_id, voter_address, choice, voting_power, signature)
      VALUES (${proposalId}, ${voter}, ${choice}, ${votingPower.totalPower}, ${signature})
      ON CONFLICT (proposal_id, voter_address) 
      DO UPDATE SET 
        choice = ${choice}, 
        voting_power = ${votingPower.totalPower}, 
        signature = ${signature},
        voted_at = CURRENT_TIMESTAMP
    `;

    return NextResponse.json({
      success: true,
      votingPower: votingPower.totalPower,
    });
  } catch (error) {
    console.error("Failed to record vote:", error);
    return NextResponse.json({ error: "Failed to record vote" }, { status: 500 });
  }
}
