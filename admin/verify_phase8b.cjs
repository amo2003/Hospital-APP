const path = require('path');
const fs = require('fs');
const { chromium } = require('d:/Hospital App/Hospital-APP/mobile/mobile/node_modules/playwright-core');

const ARTIFACT_DIR = 'C:/Users/Asus/.gemini/antigravity-ide/brain/716dbc3a-706f-4636-b1e8-091f30ab220c';
const EDGE_PATH = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

async function run() {
  console.log('--- STARTING PHASE 8B END-TO-END VERIFICATION ---');

  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 430, height: 932 },
  });

  const page = await context.newPage();

  // 1. Open Admin Web Portal on port 3001
  console.log('1. Navigating to http://localhost:3001 ...');
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '01_admin_login.png') });
  console.log('Saved: 01_admin_login.png');

  // 2. Perform Login
  console.log('2. Logging in as Administrator...');
  await page.fill('#adminIdInput', 'admin');
  await page.fill('#adminPasswordInput', 'Admin123..');
  await page.click('#loginBtn');

  // Wait for dashboard
  await page.waitForSelector('#dashboardView', { state: 'visible', timeout: 5000 });
  await page.waitForTimeout(1000); // Allow live data to fetch

  const totalDocs = await page.textContent('#totalDoctors');
  const pendingApprovals = await page.textContent('#pendingApprovals');
  console.log(`Dashboard metrics: Total Doctors = ${totalDocs}, Pending Approvals = ${pendingApprovals}`);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '02_admin_dashboard.png') });
  console.log('Saved: 02_admin_dashboard.png');

  // 3. Open Screen 4.11: Approval Requests
  console.log('3. Opening Screen 4.11 (Approval requests)...');
  await page.click('#reviewBtn');
  await page.waitForSelector('#approvalsView', { state: 'visible', timeout: 5000 });
  await page.waitForTimeout(1000);

  const pendingTabLabel = await page.textContent('#tabPending');
  console.log(`Active Tab: ${pendingTabLabel}`);

  const doctorCards = await page.$$('.doctor-card');
  console.log(`Found ${doctorCards.length} pending doctor cards`);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '03_screen_4_11_pending_list.png') });
  console.log('Saved: 03_screen_4_11_pending_list.png');

  // 4. Open Doctor Details modal for Dr. Nadeesha Perera
  console.log('4. Opening Doctor Details & Credentials modal for Dr. Nadeesha Perera...');
  const viewDocsButtons = await page.$$('.doctor-card .btn-view-docs');
  if (viewDocsButtons.length > 0) {
    // Click the second one (Nadeesha)
    await viewDocsButtons[viewDocsButtons.length - 1].click();
    await page.waitForSelector('#doctorDetailsModal', { state: 'visible', timeout: 3000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '04_doctor_details_modal.png') });
    console.log('Saved: 04_doctor_details_modal.png');
    
    // Close modal
    await page.click('#closeDoctorDetailsModal');
    await page.waitForSelector('#doctorDetailsModal', { state: 'hidden', timeout: 3000 });
    await page.waitForTimeout(500);
  }

  // 5. Test Approve flow on Dr. Nadeesha Perera
  console.log('5. Approving Dr. Nadeesha Perera...');
  const cardApproveBtns = await page.$$('.doctor-card .btn-card-approve');
  // Click Dr. Nadeesha's approve button (last card)
  await cardApproveBtns[cardApproveBtns.length - 1].click();
  await page.waitForSelector('#confirmActionModal', { state: 'visible', timeout: 3000 });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '05_approve_confirm_modal.png') });
  console.log('Saved: 05_approve_confirm_modal.png');

  await page.click('#executeConfirmBtn');
  // Wait for confirmation modal to close and list to reload
  await page.waitForSelector('#confirmActionModal', { state: 'hidden', timeout: 5000 });
  await page.waitForTimeout(2000);
  console.log('Approve action completed. Reloading list...');

  const pendingCountAfterApprove = await page.textContent('#tabPending');
  console.log(`Tab after approve: ${pendingCountAfterApprove}`);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '06_list_after_approval.png') });
  console.log('Saved: 06_list_after_approval.png');

  // 6. Test Reject flow on Dr. Ravindu Jayawardena
  console.log('6. Rejecting Dr. Ravindu Jayawardena...');
  const rejectBtn = await page.$('.doctor-card .btn-card-reject');
  await rejectBtn.click();
  await page.waitForSelector('#confirmActionModal', { state: 'visible', timeout: 3000 });
  await page.fill('#rejectionReasonInput', 'SLMC credentials verification failed with Sri Lanka Medical Council.');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '07_reject_confirm_modal.png') });
  console.log('Saved: 07_reject_confirm_modal.png');

  await page.click('#executeConfirmBtn');
  await page.waitForSelector('#confirmActionModal', { state: 'hidden', timeout: 5000 });
  await page.waitForTimeout(2000);
  console.log('Reject action completed.');

  const pendingCountAfterReject = await page.textContent('#tabPending');
  console.log(`Tab after reject: ${pendingCountAfterReject}`);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '08_pending_empty_state.png') });
  console.log('Saved: 08_pending_empty_state.png');

  // 7. Verify Approved Tab
  console.log('7. Switching to Approved Tab...');
  await page.click('#tabApproved');
  await page.waitForTimeout(1500);
  const approvedCards = await page.$$('.doctor-card');
  console.log(`Approved tab has ${approvedCards.length} doctors`);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '09_approved_tab.png') });
  console.log('Saved: 09_approved_tab.png');

  // 8. Verify Rejected Tab
  console.log('8. Switching to Rejected Tab...');
  await page.click('#tabRejected');
  await page.waitForTimeout(1500);
  const rejectedCards = await page.$$('.doctor-card');
  console.log(`Rejected tab has ${rejectedCards.length} doctors`);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '10_rejected_tab.png') });
  console.log('Saved: 10_rejected_tab.png');

  // 9. Back to Dashboard
  console.log('9. Returning to Dashboard...');
  await page.click('#backToDashBtn');
  await page.waitForSelector('#dashboardView', { state: 'visible', timeout: 3000 });
  await page.waitForTimeout(1000);

  const finalPending = await page.textContent('#pendingApprovals');
  const finalDoctors = await page.textContent('#totalDoctors');
  console.log(`Final Dashboard Metrics: Pending = ${finalPending}, Total Doctors = ${finalDoctors}`);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '11_final_dashboard.png') });
  console.log('Saved: 11_final_dashboard.png');

  await browser.close();
  console.log('--- ALL BROWSER STEPS COMPLETED SUCCESSFULLY ---');
}

run().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
