// Uses local static files and mocked APIs only. Run after the web export in docs/APPOINTMENT_PAYMENTS.md.
const { chromium, expect } = require("@playwright/test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

async function main() {
  const webRoot = path.resolve(".expo/theme-check");
  const adminRoot = path.resolve("../../admin");
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    const admin = url.pathname.startsWith("/admin/");
    const root = admin ? adminRoot : webRoot;
    let file = path.resolve(root, "." + decodeURIComponent(admin ? url.pathname.slice(6) : url.pathname));
    if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!fs.existsSync(file) && fs.existsSync(file + ".html")) file += ".html";
    if (!fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    res.setHeader("Content-Type", { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml" }[path.extname(file)] || "application/octet-stream");
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({ viewport: { width: 393, height: 852 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const out = path.resolve("artifacts/theme"); fs.mkdirSync(out, { recursive: true });

  const patient = { id: 'patient', patientId: 'PT-TEST', fullName: 'Test Patient', email: 'patient@example.com', medicalDetails: {}, dateOfBirth: '1990-01-01' };
  const nurse = { id: 'nurse', nurseId: 'NUR-TEST', fullName: 'Test Nurse', email: 'nurse@example.com', status: 'active', department: 'General OPD', phone: '0771234567' };
  const doctor = { id: 'doctor', fullName: 'Test Doctor', specialty: 'General Medicine', hospital: 'Test Hospital', status: 'approved' };
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url()); let data = [];
    if(route.request().method()==='OPTIONS') return route.fulfill({status:204,headers});
    if(url.pathname.endsWith('/profile')) data = url.pathname.includes('/nurse/') ? nurse : patient;
    if(url.pathname.endsWith('/me')) data = {doctor};
    if(url.pathname.endsWith('/queue')) data = url.pathname.includes('/nurse/') ? { entries: [] } : null;
    if(url.pathname.endsWith('/auth/login')) data = {token:'test',patient,nurse};
    if(url.pathname.endsWith('/dashboard')) data = {doctor,stats:{},todaySchedule:[],nextPatient:null};
    return route.fulfill({headers,contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.route('https://accounts.google.com/**',route=>route.abort());
  try {
    await page.goto(base+'/patient/home');
    await page.getByRole('button',{name:'Open menu',exact:true}).click();
    await page.getByRole('radio',{name:'Dark theme',exact:true}).click();
    await expect(page.getByRole('radio',{name:'Dark theme',exact:true})).toBeChecked();
    assert.equal(await page.evaluate(()=>localStorage.getItem('@careplus/theme')),'dark');
    await page.screenshot({path:path.join(out,'patient-menu-dark.png')});
    await page.getByRole('button',{name:'Close menu',exact:true}).last().click();
    await expect(page.getByText('Quick Actions',{exact:true})).toHaveCSS('color','rgb(230, 238, 249)');
    await page.screenshot({path:path.join(out,'patient-home-dark.png')});
    await page.reload();
    await expect(page.getByText('Quick Actions',{exact:true})).toHaveCSS('color','rgb(230, 238, 249)');
    await page.goto(base+'/doctor/appointments');
    await page.getByText('Profile',{exact:true}).click();
    await expect(page.getByRole('radio',{name:'Dark theme',exact:true})).toBeChecked();
    await page.waitForTimeout(350);
    await page.screenshot({path:path.join(out,'doctor-profile-dark.png')});
    await page.getByRole('radio',{name:'Light theme',exact:true}).click();
    await expect(page.getByRole('radio',{name:'Light theme',exact:true})).toBeChecked();
    assert.equal(await page.evaluate(()=>localStorage.getItem('@careplus/theme')),'light');
    await page.goto(base+'/nurse/login');
    await page.getByLabel('Staff ID',{exact:true}).fill('NUR-TEST');
    await page.getByLabel('Password',{exact:true}).fill('TestPassword123');
    await page.getByRole('button',{name:'Log In',exact:true}).click();
    await page.getByText('Profile',{exact:true}).click();
    await expect(page.getByRole('radio',{name:'Light theme',exact:true})).toBeChecked();
    await page.getByRole('radio',{name:'Dark theme',exact:true}).click();
    await expect(page.getByRole('radio',{name:'Dark theme',exact:true})).toBeChecked();
    await page.screenshot({path:path.join(out,'nurse-profile-dark.png')});
    await page.goto(base+'/register');
    await expect(page.getByLabel('Full Name',{exact:true})).toHaveCSS('color','rgb(230, 238, 249)');
    await page.screenshot({path:path.join(out,'registration-dark.png')});
    assert.deepEqual(errors,[]);
    console.log('PASS: patient, doctor and nurse selectors, global change, reload persistence, dark form and no page errors');
  } catch(e) { await page.screenshot({path:path.join(out,'failure.png')});console.log('STATE',await page.evaluate(()=>({theme:localStorage.getItem('@careplus/theme'),text:document.body.innerText.slice(-1200)})), errors);throw e; } finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
