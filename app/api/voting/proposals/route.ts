import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { ethers } from "ethers";
import { ProposalWithResults } from "~~/lib/voting/types";

export async function GET() {
  try {
    // Return empty array if database is not set up
    if (!process.env.POSTGRES_URL) {
      return NextResponse.json([]);
    }

    const { rows } = await sql`
      SELECT 
        p.*,
        COALESCE(
          json_agg(
            json_build_object(
              'voter_address', v.voter_address,
              'choice', v.choice,
              'voting_power', v.voting_power
            )
          ) FILTER (WHERE v.id IS NOT NULL),
          '[]'
        ) as votes
      FROM proposals p
      LEFT JOIN votes v ON p.id = v.proposal_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;

    // Calculate results
    const proposals: ProposalWithResults[] = rows.map((proposal: any) => {
      const results = new Array(proposal.options.length).fill(0);
      proposal.votes.forEach((vote: any) => {
        results[vote.choice] += Number(vote.voting_power);
      });

      const totalVotes = proposal.votes.length;
      const status = new Date() < new Date(proposal.voting_end) ? "active" : "ended";

      return {
        ...proposal,
        results,
        totalVotes,
        status,
      } as ProposalWithResults;
    });

    return NextResponse.json(proposals);
  } catch (error) {
    console.error("Failed to fetch proposals:", error);
    return NextResponse.json({ error: "Failed to fetch proposals" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // TODO: Add authentication check for admin users
    // For now, you could check if the creator holds a certain amount of tokens

    // Validate required fields
    if (!body.title || !body.options || body.options.length < 2) {
      return NextResponse.json({ error: "Invalid proposal data" }, { status: 400 });
    }

    // Get current block number for snapshot
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    const currentBlock = await provider.getBlockNumber();

    // Set default voting period (7 days) if not provided
    const votingStart = body.votingStart || new Date();
    const votingEnd = body.votingEnd || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const { rows } = await sql`
      INSERT INTO proposals (
        title, description, options, category, 
        created_by, snapshot_block, voting_start, voting_end
      ) VALUES (
        ${body.title},
        ${body.description || ""},
        ${body.options},
        ${body.category || "general"},
        ${body.createdBy},
        ${currentBlock},
        ${votingStart},
        ${votingEnd}
      )
      RETURNING *
    `;

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("Failed to create proposal:", error);
    return NextResponse.json({ error: "Failed to create proposal" }, { status: 500 });
  }
}
