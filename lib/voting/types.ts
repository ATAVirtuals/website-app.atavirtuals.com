export interface Proposal {
  id: number;
  title: string;
  description: string;
  options: string[];
  category?: string;
  created_by: string;
  snapshot_block: number;
  voting_start: Date;
  voting_end: Date;
  created_at: Date;
}

export interface Vote {
  id: number;
  proposal_id: number;
  voter_address: string;
  choice: number;
  voting_power: string;
  signature: string;
  voted_at: Date;
}

export interface VotingPower {
  totalPower: string;
  breakdown: {
    amount: string;
    weeks: number;
    multiplier: number;
    power: string;
  }[];
  address: string;
  blockNumber: number;
}

export interface VoteMessage {
  proposalId: number;
  voter: string;
  choice: number;
  timestamp: number;
}

export interface ProposalWithResults extends Proposal {
  votes: Vote[];
  results: number[];
  totalVotes: number;
  status: "active" | "ended";
}
