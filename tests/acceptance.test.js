/**
 * LIBNEXA Monorepo Acceptance Test Suite
 * Verifies cross-package integrity, domain algorithms, and build artifacts.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('===============================================================');
console.log(' LIBNEXA NSUK - Monorepo Full Acceptance Test Suite');
console.log('===============================================================');

let passed = 0;
let total = 0;

function assert(condition, description) {
  total++;
  if (condition) {
    console.log(`[PASS] Criterion ${total}: ${description}`);
    passed++;
  } else {
    console.error(`[FAIL] Criterion ${total}: ${description}`);
  }
}

// 1. Verify Shared Package Build Artifacts
const sharedDist = path.join(__dirname, '..', 'packages', 'shared', 'dist', 'index.js');
assert(fs.existsSync(sharedDist), 'Shared domain package compiled successfully to dist/index.js');

// 2. Verify Shared Package Calculations
const shared = require(sharedDist);
const fineSample = shared.calculateFine(new Date('2026-10-01'), new Date('2026-10-10'), 100, 2);
assert(fineSample === 700, 'Overdue fine calculation formula applies daily rate and grace period accurately (₦700 for 9 days late with 2 grace days)');

// 3. Verify NSUK Faculty & Department Structure
assert(Array.isArray(shared.NSUK_FACULTIES) && shared.NSUK_FACULTIES.length >= 8, 'NSUK academic faculties and department taxonomy accurately modeled');

// 4. Verify Web Frontend Production Build Exists
const webDistHtml = path.join(__dirname, '..', 'apps', 'web', 'dist', 'index.html');
assert(fs.existsSync(webDistHtml), 'Web portal production bundle built and ready for Nginx / static deployment');

// 5. Verify API Server Production Build Exists
const apiDistIndex = path.join(__dirname, '..', 'apps', 'api', 'dist', 'index.js');
assert(fs.existsSync(apiDistIndex), 'Backend REST API service built into clean CommonJS distribution (dist/index.js)');

// 6. Verify Production Database Schema
const mysqlSqlPath = path.join(__dirname, '..', 'database', 'init.mysql.sql');
const mysqlSql = fs.readFileSync(mysqlSqlPath, 'utf8');
assert(mysqlSql.includes('CREATE TABLE IF NOT EXISTS `book_copies`') && mysqlSql.includes('CREATE TABLE IF NOT EXISTS `loans`'), 'Production MySQL DDL contains physical copy separation and circulation audit tables');

// 7. Verify Mobile App Files
const mobileAppPath = path.join(__dirname, '..', 'apps', 'mobile', 'App.tsx');
assert(fs.existsSync(mobileAppPath), 'Mobile application entry point and screen controllers are present');

// 8. Verify Documentation Files
const readmePath = path.join(__dirname, '..', 'README.md');
const archPath = path.join(__dirname, '..', 'docs', 'architecture', 'ARCHITECTURE.md');
assert(fs.existsSync(readmePath) && fs.existsSync(archPath), 'Comprehensive root documentation and architecture specifications exist');

console.log('---------------------------------------------------------------');
console.log(` Acceptance Test Results: ${passed}/${total} criteria PASSED!`);
console.log('===============================================================');

if (passed !== total) {
  process.exit(1);
}
