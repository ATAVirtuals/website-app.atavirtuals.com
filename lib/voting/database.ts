import { sql } from "@vercel/postgres";

// Initialize database tables
export async function initializeDatabase() {
  // Create proposals table
  await sql`
    CREATE TABLE IF NOT EXISTS proposals (
      id SERIAL PRIMARY KEY,
      title VARCHAR(256) NOT NULL,
      description TEXT,
      options TEXT[] NOT NULL,
      category VARCHAR(50),
      created_by VARCHAR(42) NOT NULL,
      snapshot_block BIGINT NOT NULL,
      voting_start TIMESTAMP NOT NULL,
      voting_end TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Create votes table
  await sql`
    CREATE TABLE IF NOT EXISTS votes (
      id SERIAL PRIMARY KEY,
      proposal_id INTEGER REFERENCES proposals(id),
      voter_address VARCHAR(42) NOT NULL,
      choice INTEGER NOT NULL,
      voting_power NUMERIC NOT NULL,
      signature TEXT NOT NULL,
      voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(proposal_id, voter_address)
    )
  `;
}

// Helper functions
export async function getProposal(id: number) {
  const { rows } = await sql`
    SELECT * FROM proposals WHERE id = ${id}
  `;
  return rows[0];
}

export async function getProposalWithVotes(id: number) {
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
    WHERE p.id = ${id}
    GROUP BY p.id
  `;
  return rows[0];
}

export async function hasVoted(proposalId: number, voterAddress: string) {
  const { rows } = await sql`
    SELECT 1 FROM votes 
    WHERE proposal_id = ${proposalId} 
    AND voter_address = ${voterAddress}
  `;
  return rows.length > 0;
}
