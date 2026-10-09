// Run after: npx expo export --platform web --output-dir .expo/reports-check
const { chromium, expect } = require('@playwright/test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

async function main() {
  const root = path.resolve('.expo/reports-check');
  const server = http.createServer((req, res) => {
    let file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file) && fs.existsSync(file + '.html')) file += '.html';
    if (!fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    res.setHeader('Content-Type', { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' }[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 393, height: 852 } });
  await context.addInitScript(() => { window.print = () => { throw new Error('Print dialog must not open'); };
    const original = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(...args) {
      const result = original.apply(this, args);
      if (this.width === 1376) { window.__pdfPages = window.__pdfPages || []; window.__pdfPages.push(result); }
      return result;
    }; });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const out = path.resolve('artifacts/reports'); fs.mkdirSync(out, { recursive: true });
  const nurse = { id: 'nurse', nurseId: 'NUR-TEST', fullName: 'Test Nurse', status: 'active', department: 'General Medicine', email: 'nurse@example.com', phone: '0771234567' };
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url()); let data = [];
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (url.pathname.endsWith('/auth/login')) data = { token: 'test', nurse };
    if (url.pathname.endsWith('/profile')) data = nurse;
    if (url.pathname.endsWith('/queue')) data = { entries: [] };
    if (url.pathname.endsWith('/reports/completed')) {
      const from = url.searchParams.get('from'), to = url.searchParams.get('to');
      const empty = from === '2026-01-01';
      const daily = [];
      for (let date = Date.parse(from); date <= Date.parse(to); date += 86400000) daily.push({ date: new Date(date).toISOString().slice(0, 10), count: !empty && date === Date.parse(to) ? 2 : 0 });
      data = { from, to, generatedAt: new Date().toISOString(), hospital: 'CarePlus Test Hospital', department: 'General Medicine', summary: { completed: empty ? 0 : 2, patients: empty ? 0 : 2, doctors: empty ? 0 : 1, averagePerDay: empty ? 0 : 0.3 }, daily, byDoctor: empty ? [] : [{ id: 'doctor', name: 'Dr. Anura Bandara', count: 2 }], records: empty ? [] : ['Amod Indupa', 'Nimal Kumar'].map((name, i) => ({ id: String(i), token: 'A-00' + i, date: to, time: '09:15', department: 'General Medicine', patientId: 'PT-TEST' + i, patientName: name, appointmentId: 'OPD-TEST' + i, doctorId: 'doctor', doctorName: 'Dr. Anura Bandara', completedAt: i ? null : new Date().toISOString() })) };
    }
    return route.fulfill({ headers, contentType: 'application/json', body: JSON.stringify(data) });
  });
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}/nurse/login`);
    await page.getByLabel('Staff ID', { exact: true }).fill('NUR-TEST');
    await page.getByLabel('Password', { exact: true }).fill('TestPassword123');
    await page.getByRole('button', { name: 'Log In', exact: true }).click();
    await page.getByText('Reports', { exact: true }).filter({ visible: true }).click();
    await expect(page.getByText('CarePlus Test Hospital', { exact: true })).toBeVisible();
    await page.getByText('Completed visits by day', { exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(out, 'charts-light.png') });
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
    const download = await downloadPromise;
    assert.match(download.suggestedFilename(), /^CarePlus-Queue-.*\.pdf$/);
    await download.saveAs(path.join(out, 'completed-queue-sample.pdf'));
    const pdf = fs.readFileSync(path.join(out, 'completed-queue-sample.pdf'));
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
    assert.ok(pdf.length > 10000, 'Downloaded PDF should include report content');
    assert.ok(!context.pages().some(p=>p!==page && p.url()==='about:blank'), 'No print/preview tab should open');
    const renderedPages = await page.evaluate(() => window.__pdfPages || []);
    assert.ok(renderedPages.length > 0);
    fs.writeFileSync(path.join(out, 'downloaded-pdf-page.png'), Buffer.from(renderedPages[0].split(',')[1], 'base64'));
    await expect(page.getByText('PDF download started.', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Tamil', exact: true }).click();
    await expect(page.getByText('முடிக்கப்பட்ட வரிசை அறிக்கை', { exact: true })).toBeAttached();
    await page.getByText('நாள் வாரியாக முடிக்கப்பட்ட வருகைகள்', { exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(out, 'charts-tamil.png') });
    const tamilDownloadPromise = page.waitForEvent('download');
    await page.evaluate(() => { window.__pdfPages = []; });
    await page.getByRole('button', { name: '\u0050\u0044\u0046 \u0baa\u0ba4\u0bbf\u0bb5\u0bbf\u0bb1\u0b95\u0bcd\u0b95\u0bc1', exact: true }).click();
    const tamilDownload = await tamilDownloadPromise;
    await tamilDownload.saveAs(path.join(out, 'completed-queue-tamil.pdf'));
    const tamilPages = await page.evaluate(() => window.__pdfPages || []);
    assert.ok(tamilPages.length > 0);
    fs.writeFileSync(path.join(out, 'downloaded-pdf-tamil.png'), Buffer.from(tamilPages[0].split(',')[1], 'base64'));

    await page.getByRole('button', { name: 'English', exact: true }).click();
    await page.getByRole('button', { name: 'Profile', exact: true }).click();
    await page.getByRole('radio', { name: 'Dark theme', exact: true }).click();
    await page.getByRole('button', { name: 'Home', exact: true }).click();
    await page.getByText('Reports', { exact: true }).filter({ visible: true }).click();
    await page.getByText('Completed visits by day', { exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(out, 'charts-dark.png') });
    await page.getByLabel('From date', { exact: true }).fill('2026-01-01');
    await page.getByLabel('To date', { exact: true }).fill('2026-01-01');
    await page.getByRole('button', { name: 'Apply dates', exact: true }).click();
    await expect(page.getByText('No completed records', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download PDF', exact: true })).toBeDisabled();
    await page.getByLabel('From date', { exact: true }).fill('2026-01-03');
    await page.getByRole('button', { name: 'Apply dates', exact: true }).click();
    await expect(page.getByText('Choose a date range of up to 90 days, with the start before the end.', { exact: true })).toBeVisible();
    assert.deepEqual(errors, []);
    console.log('PASS: Reports navigation, real-data rendering, PDF content, Tamil, dark theme, empty state and date validation.');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
