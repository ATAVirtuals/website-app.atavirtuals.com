import { sql } from '@vercel/postgres';
import { initializeDatabase } from '../lib/voting/database';

async function main() {
  console.log('Initializing voting database...');
  
  try {
    await initializeDatabase();
    console.log('✅ Database initialized successfully');
    
    // Optional: Create sample proposal
    if (process.env.CREATE_SAMPLE === 'true') {
      const { rows } = await sql`
        INSERT INTO proposals (
          title,
          description,
          options,
          category,
          created_by,
          snapshot_block,
          voting_start,
          voting_end
        ) VALUES (
          'Which feature should we prioritize next?',
          'Vote on the next major feature for the ATA platform',
          ARRAY['Mobile App', 'Advanced Analytics', 'Social Features', 'API Access'],
          'development',
          '0x0000000000000000000000000000000000000000',
          1000000,
          NOW(),
          NOW() + INTERVAL '7 days'
        )
        RETURNING id
      `;
      
      console.log(`✅ Created sample proposal with ID: ${rows[0].id}`);
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

main();