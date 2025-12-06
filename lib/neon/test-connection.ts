import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

// Load .env.local (Next.js convention)
config({ path: '.env.local' });

async function testConnection() {
  if (!process.env.NEON_DATABASE_URL) {
    throw new Error('NEON_DATABASE_URL is not defined in .env.local');
  }

  const sql = neon(process.env.NEON_DATABASE_URL);

  console.log('Testing Neon connection to Poverty-Stoplight-Warehouse...\n');

  // Test 1: Simple count query
  const countResult = await sql`
    SELECT COUNT(*) as total_rows
    FROM analytics_marts.mart_indicators
  `;
  console.log('Total rows in mart_indicators:', countResult[0].total_rows);

  // Test 2: Sample data with grouping
  const sampleResult = await sql`
    SELECT
      indicator_name,
      dimension_name,
      COUNT(*) as count
    FROM analytics_marts.mart_indicators
    GROUP BY indicator_name, dimension_name
    ORDER BY count DESC
    LIMIT 5
  `;

  console.log('\nTop 5 indicator/dimension combinations:');
  console.table(sampleResult);

  // Test 3: Check distinct organizations
  const orgsResult = await sql`
    SELECT DISTINCT organization_name
    FROM analytics_marts.mart_indicators
    WHERE organization_name IS NOT NULL
    LIMIT 10
  `;

  console.log('\nSample organizations:');
  orgsResult.forEach((row, i) => console.log(`  ${i + 1}. ${row.organization_name}`));

  console.log('\n✅ Connection test passed!');
}

testConnection().catch((error) => {
  console.error('❌ Connection test failed:', error.message);
  process.exit(1);
});
