/**
 * db-viewer.js
 * Run this script WHILE the server is already running to view all database contents.
 * Usage: node db-viewer.js
 * 
 * NOTE: Since the main server already holds the MongoDB lock,
 *       this script reads the raw data files directly using WiredTiger.
 *       The easiest way is to call the API endpoints instead.
 */

const http = require('http');

const BASE = 'http://localhost:3000';
const ADMIN_TOKEN_HINT = 'Run the server, login as admin, copy the token from localStorage, and paste below:';

// ── Paste your admin JWT token here ──────────────────────────────
const ADMIN_TOKEN = process.argv[2] || '';
// ─────────────────────────────────────────────────────────────────

if (!ADMIN_TOKEN) {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║          DB Viewer - HR Operations           ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('\nUsage:');
  console.log('  1. Start your server: node backend/server.js');
  console.log('  2. Login as admin at http://localhost:3000/frontend/pages/login.html?role=admin');
  console.log('  3. Open browser DevTools → Application → Local Storage');
  console.log('  4. Copy the value of "hr_token"');
  console.log('  5. Run: node db-viewer.js <your-token-here>\n');
  process.exit(0);
}

function get(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api' + path,
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + ADMIN_TOKEN }
    };
    http.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, body: data }); }
      });
    }).on('error', reject);
  });
}

function section(title) {
  console.log('\n' + '═'.repeat(55));
  console.log('  ' + title);
  console.log('═'.repeat(55));
}

function table(data, columns) {
  if (!Array.isArray(data) || data.length === 0) {
    console.log('  (empty)');
    return;
  }
  data.forEach((row, i) => {
    console.log(`\n  [${i + 1}]`);
    columns.forEach(col => {
      const val = col.split('.').reduce((o, k) => o?.[k], row);
      console.log(`    ${col.padEnd(20)}: ${JSON.stringify(val) || '-'}`);
    });
  });
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║          DB Viewer - HR Operations           ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('  Connecting to http://localhost:3000...\n');

  // 1. Stats overview
  section('📊 OVERALL STATS');
  const stats = await get('/admin/stats');
  if (stats.status === 200) {
    const s = stats.body;
    console.log(`  Total Applications : ${s.totalApplicants}`);
    console.log(`  Selected           : ${s.selected}`);
    console.log(`  Rejected           : ${s.rejected}`);
    console.log(`  Pending            : ${s.pending}`);
    if (s.companyStats) {
      console.log('\n  Company Breakdown:');
      Object.entries(s.companyStats).forEach(([name, cs]) => {
        console.log(`    ${name.padEnd(25)} Total: ${cs.total}  Selected: ${cs.selected}  Rejected: ${cs.rejected}`);
      });
    }
  } else {
    console.log('  Could not fetch stats:', stats.body);
  }

  // 2. Companies
  section('🏢 COMPANIES');
  const companies = await get('/admin/companies');
  if (companies.status === 200) {
    table(companies.body, ['name', 'email', 'website', 'createdAt']);
  } else {
    console.log('  Could not fetch companies:', companies.body);
  }

  // 3. Users (sub-accounts)
  section('👤 PLATFORM USERS');
  const users = await get('/admin/users');
  if (users.status === 200) {
    table(users.body, ['username', 'email', 'role', 'createdAt']);
  } else {
    console.log('  Could not fetch users:', users.body);
  }

  // 4. Applications
  section('📄 APPLICATIONS');
  const apps = await get('/admin/applications');
  if (apps.status === 200) {
    table(apps.body, ['applicantName', 'applicantEmail', 'opportunityId', 'status', 'createdAt']);
  } else {
    console.log('  Could not fetch applications:', apps.body);
  }

  console.log('\n' + '═'.repeat(55));
  console.log('  ✅ Done');
  console.log('═'.repeat(55) + '\n');
}

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  console.log('Make sure the server is running: node backend/server.js\n');
});
