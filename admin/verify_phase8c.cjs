const path = require('path');
const fs = require('fs');
const { chromium } = require('d:/Hospital App/Hospital-APP/mobile/mobile/node_modules/playwright-core');

const ARTIFACT_DIR = 'C:/Users/Asus/.gemini/antigravity-ide/brain/716dbc3a-706f-4636-b1e8-091f30ab220c';
const EDGE_PATH = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

async function run() {
  console.log('--- STARTING PHASE 8C END-TO-END VERIFICATION ---');

  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 430, height: 932 },
    acceptDownloads: true,
  });

  const page = await context.newPage();

  // 1. Open Admin Web Portal on port 3001
  console.log('1. Navigating to http://localhost:3001 ...');
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });

  // 2. Login
  console.log('2. Signing in as Administrator...');
  const isLoginVisible = await page.isVisible('#loginView');
  if (isLoginVisible) {
    await page.fill('#adminIdInput', 'admin');
    await page.fill('#adminPasswordInput', 'Admin123..');
    await page.click('#loginBtn');
    await page.waitForSelector('#dashboardView', { state: 'visible', timeout: 5000 });
  }

  await page.waitForTimeout(1000);
  console.log('Dashboard active.');

  // 3. Open Screen 4.12: Reports (click "View reports" action button)
  console.log('3. Clicking "View reports" on Dashboard...');
  await page.click('#viewReportsBtn');
  await page.waitForSelector('#reportsView', { state: 'visible', timeout: 5000 });
  await page.waitForTimeout(1500);

  // 4. Verify Daily Report
  console.log('4. Verifying Daily Report (Figma 4.12)...');
  const dailyDate = await page.textContent('#reportsDateRange');
  const dailyVolumeSubtitle = await page.textContent('#volumeSubtitle');
  const dailyWaitSubtitle = await page.textContent('#waitSubtitle');
  const dailyNoShow = await page.textContent('#noShowRateVal');
  const dailyPeak = await page.textContent('#peakHoursVal');
  const dailyCancelled = await page.textContent('#summaryCancelledCount');

  console.log(`Daily Date Range: ${dailyDate}`);
  console.log(`Daily Volume Subtitle: ${dailyVolumeSubtitle}`);
  console.log(`Daily Wait Subtitle: ${dailyWaitSubtitle}`);
  console.log(`Daily No-show: ${dailyNoShow}`);
  console.log(`Daily Peak: ${dailyPeak}`);
  console.log(`Daily Cancelled in Summary: ${dailyCancelled}`);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, '12_screen_4_12_reports_daily.png') });
  console.log('Saved: 12_screen_4_12_reports_daily.png');

  // 5. Switch to Weekly Tab
  console.log('\n5. Switching to Weekly Tab...');
  await page.click('#tabWeekly');
  await page.waitForTimeout(1500);

  const weeklyDate = await page.textContent('#reportsDateRange');
  const weeklyVolumeSubtitle = await page.textContent('#volumeSubtitle');
  const weeklyPeak = await page.textContent('#peakHoursVal');
  const weeklyBadge = await page.textContent('#peakHoursBadge');

  console.log(`Weekly Date Range: ${weeklyDate}`);
  console.log(`Weekly Volume Subtitle: ${weeklyVolumeSubtitle}`);
  console.log(`Weekly Peak: ${weeklyPeak} (${weeklyBadge})`);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, '13_screen_4_12_reports_weekly.png') });
  console.log('Saved: 13_screen_4_12_reports_weekly.png');

  // 6. Switch to Monthly Tab
  console.log('\n6. Switching to Monthly Tab...');
  await page.click('#tabMonthly');
  await page.waitForTimeout(1500);

  const monthlyDate = await page.textContent('#reportsDateRange');
  const monthlyVolumeSubtitle = await page.textContent('#volumeSubtitle');

  console.log(`Monthly Date Range: ${monthlyDate}`);
  console.log(`Monthly Volume Subtitle: ${monthlyVolumeSubtitle}`);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, '14_screen_4_12_reports_monthly.png') });
  console.log('Saved: 14_screen_4_12_reports_monthly.png');

  // 7. Test Export Report (CSV)
  console.log('\n7. Testing CSV Export...');
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 5000 }),
    page.click('#exportReportBtn'),
  ]);

  const downloadPath = path.join(ARTIFACT_DIR, download.suggestedFilename());
  await download.saveAs(downloadPath);
  console.log(`Report downloaded: ${download.suggestedFilename()} to ${downloadPath}`);

  const csvContent = fs.readFileSync(downloadPath, 'utf8');
  console.log('--- CSV Content Preview ---');
  console.log(csvContent.slice(0, 500));
  console.log('---------------------------');

  // 8. Navigation check: return to Dashboard
  console.log('\n8. Returning to Dashboard via Back button...');
  await page.click('#backToDashFromReportsBtn');
  await page.waitForSelector('#dashboardView', { state: 'visible', timeout: 3000 });
  console.log('Back on Dashboard.');

  // Also test bottom nav Reports icon
  console.log('Testing bottom nav Reports button...');
  await page.click('#navReports');
  await page.waitForSelector('#reportsView', { state: 'visible', timeout: 3000 });
  console.log('Successfully navigated via bottom nav Reports icon.');

  await browser.close();
  console.log('--- ALL PHASE 8C VERIFICATION STEPS PASSED SUCCESSFULLY ---');
}

run().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
