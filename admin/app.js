const API_BASE = "http://localhost:4000/api/admin";

let currentToken = localStorage.getItem("careplus_admin_token") || null;
let currentAdmin = JSON.parse(localStorage.getItem("careplus_admin_user") || "null");

// Views
const loginView = document.getElementById("loginView");
const dashboardView = document.getElementById("dashboardView");
const approvalsView = document.getElementById("approvalsView");
const nursesView = document.getElementById("nursesView");
const reportsView = document.getElementById("reportsView");

// Login elements
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const loginBtn = document.getElementById("loginBtn");

// Dashboard metrics elements
const totalDoctorsEl = document.getElementById("totalDoctors");
const totalNursesEl = document.getElementById("totalNurses");
const totalPatientsEl = document.getElementById("totalPatients");
const pendingApprovalsEl = document.getElementById("pendingApprovals");
const pendingSubtitleEl = document.getElementById("pendingSubtitle");
const activityListEl = document.getElementById("activityList");

// Approvals screen elements (Figma 4.11)
const backToDashBtn = document.getElementById("backToDashBtn");
const tabPending = document.getElementById("tabPending");
const tabApproved = document.getElementById("tabApproved");
const tabRejected = document.getElementById("tabRejected");
const doctorsListContainer = document.getElementById("doctorsListContainer");

// Reports screen elements (Figma 4.12)
const backToDashFromReportsBtn = document.getElementById("backToDashFromReportsBtn");
const reportsDateRange = document.getElementById("reportsDateRange");
const tabDaily = document.getElementById("tabDaily");
const tabWeekly = document.getElementById("tabWeekly");
const tabMonthly = document.getElementById("tabMonthly");
const volumeBarChart = document.getElementById("volumeBarChart");
const volumeSubtitle = document.getElementById("volumeSubtitle");
const waitTimeLineChart = document.getElementById("waitTimeLineChart");
const waitSubtitle = document.getElementById("waitSubtitle");
const noShowRateVal = document.getElementById("noShowRateVal");
const noShowBadge = document.getElementById("noShowBadge");
const peakHoursVal = document.getElementById("peakHoursVal");
const peakHoursBadge = document.getElementById("peakHoursBadge");
const summaryDateTag = document.getElementById("summaryDateTag");
const summaryCancelledCount = document.getElementById("summaryCancelledCount");
const exportReportBtn = document.getElementById("exportReportBtn");

// Modals
const doctorDetailsModal = document.getElementById("doctorDetailsModal");
const closeDoctorDetailsModal = document.getElementById("closeDoctorDetailsModal");
const doctorDetailsBody = document.getElementById("doctorDetailsBody");

const nurseDetailsModal = document.getElementById("nurseDetailsModal");
const closeNurseDetailsModal = document.getElementById("closeNurseDetailsModal");
const nurseDetailsBody = document.getElementById("nurseDetailsBody");

const confirmActionModal = document.getElementById("confirmActionModal");
const confirmActionTitle = document.getElementById("confirmActionTitle");
const confirmActionMessage = document.getElementById("confirmActionMessage");
const rejectReasonBox = document.getElementById("rejectReasonBox");
const rejectionReasonInput = document.getElementById("rejectionReasonInput");
const cancelConfirmBtn = document.getElementById("cancelConfirmBtn");
const executeConfirmBtn = document.getElementById("executeConfirmBtn");

// Buttons & Nav
const reviewBtn = document.getElementById("reviewBtn");
const reviewNursesBtn = document.getElementById("reviewNursesBtn");
const metricCardNurses = document.getElementById("metricCardNurses");
const viewReportsBtn = document.getElementById("viewReportsBtn");
const logoutBtn = document.getElementById("logoutBtn");
const refreshBtn = document.getElementById("refreshBtn");

const navHome = document.getElementById("navHome");
const navApprovals = document.getElementById("navApprovals");
const navNurses = document.getElementById("navNurses");
const navReports = document.getElementById("navReports");
const navProfile = document.getElementById("navProfile");
const navHomeFromApprovals = document.getElementById("navHomeFromApprovals");
const navNursesFromApprovals = document.getElementById("navNursesFromApprovals");
const navReportsFromApprovals = document.getElementById("navReportsFromApprovals");
const navProfileFromApprovals = document.getElementById("navProfileFromApprovals");
const navHomeFromReports = document.getElementById("navHomeFromReports");
const navApprovalsFromReports = document.getElementById("navApprovalsFromReports");
const navNursesFromReports = document.getElementById("navNursesFromReports");
const navProfileFromReports = document.getElementById("navProfileFromReports");

// Nurse screen elements
const backToDashFromNursesBtn = document.getElementById("backToDashFromNursesBtn");
const tabNursePending = document.getElementById("tabNursePending");
const tabNurseActive = document.getElementById("tabNurseActive");
const tabNurseRejected = document.getElementById("tabNurseRejected");
const tabNurseAll = document.getElementById("tabNurseAll");
const nursesListContainer = document.getElementById("nursesListContainer");
const navHomeFromNurses = document.getElementById("navHomeFromNurses");
const navApprovalsFromNurses = document.getElementById("navApprovalsFromNurses");
const navReportsFromNurses = document.getElementById("navReportsFromNurses");
const navProfileFromNurses = document.getElementById("navProfileFromNurses");

// State
let currentTab = "pending";
let currentNurseTab = "pending";
let cachedDoctors = [];
let cachedNurses = [];
let pendingAction = null; // { type: "doctor" | "nurse", ... }

// ──────────────── VIEW NAVIGATION ────────────────
function showLogin() {
  const paymentScreen = document.getElementById("paymentsView");
  if (paymentScreen) paymentScreen.style.display = "none";
  loginView.style.display = "flex";
  dashboardView.style.display = "none";
  approvalsView.style.display = "none";
  if (nursesView) nursesView.style.display = "none";
  if (reportsView) reportsView.style.display = "none";
}

function showDashboard() {
  const paymentScreen = document.getElementById("paymentsView");
  if (paymentScreen) paymentScreen.style.display = "none";
  loginView.style.display = "none";
  dashboardView.style.display = "flex";
  approvalsView.style.display = "none";
  if (nursesView) nursesView.style.display = "none";
  if (reportsView) reportsView.style.display = "none";
  loadDashboardData();
}

function showApprovals(tab = "pending") {
  const paymentScreen = document.getElementById("paymentsView");
  if (paymentScreen) paymentScreen.style.display = "none";
  loginView.style.display = "none";
  dashboardView.style.display = "none";
  approvalsView.style.display = "flex";
  if (nursesView) nursesView.style.display = "none";
  if (reportsView) reportsView.style.display = "none";
  switchTab(tab);
}

function showNurses(tab = "pending") {
  const paymentScreen = document.getElementById("paymentsView");
  if (paymentScreen) paymentScreen.style.display = "none";
  loginView.style.display = "none";
  dashboardView.style.display = "none";
  approvalsView.style.display = "none";
  if (reportsView) reportsView.style.display = "none";
  if (nursesView) nursesView.style.display = "flex";
  switchNurseTab(tab);
}

function showReports(period = "daily") {
  const paymentScreen = document.getElementById("paymentsView");
  if (paymentScreen) paymentScreen.style.display = "none";
  loginView.style.display = "none";
  dashboardView.style.display = "none";
  approvalsView.style.display = "none";
  if (nursesView) nursesView.style.display = "none";
  if (reportsView) reportsView.style.display = "flex";
  switchReportTab(period);
}

// ──────────────── API HELPER ────────────────
async function apiRequest(endpoint, method = "GET", body = null) {
  const headers = { "Content-Type": "application/json" };
  if (currentToken) {
    headers["Authorization"] = `Bearer ${currentToken}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  if (res.status === 401 && endpoint !== "/login") {
    localStorage.removeItem("careplus_admin_token");
    localStorage.removeItem("careplus_admin_user");
    currentToken = null;
    currentAdmin = null;
    showLogin();
    throw new Error("Session expired. Please log in again.");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "Invalid Admin ID or password.");
  }
  return data;
}

// ──────────────── 1. LOGIN ────────────────
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.style.display = "none";
  loginBtn.disabled = true;
  loginBtn.innerText = "Signing in...";

  const adminId = document.getElementById("adminIdInput").value.trim();
  const password = document.getElementById("adminPasswordInput").value;

  try {
    const data = await apiRequest("/login", "POST", { adminId, password });
    currentToken = data.token;
    currentAdmin = data.admin;
    localStorage.setItem("careplus_admin_token", currentToken);
    localStorage.setItem("careplus_admin_user", JSON.stringify(currentAdmin));
    showDashboard();
  } catch (err) {
    loginError.innerText = err.message;
    loginError.style.display = "block";
  } finally {
    loginBtn.disabled = false;
    loginBtn.innerText = "Sign in to Admin Portal";
  }
});

// ──────────────── 2. DASHBOARD DATA ────────────────
async function loadDashboardData() {
  try {
    const data = await apiRequest("/dashboard");

    // Metrics from real MongoDB data
    totalDoctorsEl.innerText = data.metrics?.totalDoctors ?? data.doctors?.approved ?? 0;
    totalNursesEl.innerText = data.metrics?.totalNurses ?? data.nurses?.active ?? 0;
    totalPatientsEl.innerText = data.metrics?.totalPatients ?? 0;

    const pendingDocs = data.doctors?.pending ?? data.metrics?.pendingDoctors ?? 0;
    const pendingNurses = data.nurses?.pending ?? data.metrics?.pendingNurses ?? 0;
    const totalPending = pendingDocs + pendingNurses;

    pendingApprovalsEl.innerText = totalPending;
    pendingSubtitleEl.innerText = `${pendingDocs} doctor${pendingDocs === 1 ? "" : "s"}, ${pendingNurses} nurse${pendingNurses === 1 ? "" : "s"} waiting`;
    tabPending.innerText = `Pending - ${pendingDocs}`;
    if (tabNursePending) tabNursePending.innerText = `Pending - ${pendingNurses}`;

    // Recent activity log
    renderRecentActivity(data.recentActivity || []);
  } catch (err) {
    console.error("Failed to load dashboard data:", err);
  }
}

function renderRecentActivity(items) {
  if (!items || items.length === 0) {
    activityListEl.innerHTML = '<div style="padding: 10px; color: #94a3b8; font-size: 13px; text-align: center;">No recent activity yet.</div>';
    return;
  }

  activityListEl.innerHTML = items
    .map(
      (item) => `
    <div class="activity-item">
      <div style="display: flex; align-items: flex-start; flex: 1;">
        <div class="activity-bullet"></div>
        <div class="activity-text">${item.text}</div>
      </div>
      <div class="activity-time">recently</div>
    </div>
  `
    )
    .join("");
}

// ──────────────── 3. APPROVALS SCREEN (Figma 4.11) ────────────────
function switchTab(tab) {
  currentTab = tab;
  tabPending.classList.toggle("active", tab === "pending");
  tabApproved.classList.toggle("active", tab === "approved");
  tabRejected.classList.toggle("active", tab === "rejected");
  loadDoctorsList(tab);
}

tabPending.addEventListener("click", () => switchTab("pending"));
tabApproved.addEventListener("click", () => switchTab("approved"));
tabRejected.addEventListener("click", () => switchTab("rejected"));

backToDashBtn.addEventListener("click", () => showDashboard());
navHomeFromApprovals.addEventListener("click", () => showDashboard());
navProfileFromApprovals.addEventListener("click", () => logoutBtn.click());

async function loadDoctorsList(status = "pending") {
  doctorsListContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: #64748b; font-size: 13px;">Loading requests from MongoDB...</div>';

  try {
    const doctors = await apiRequest(`/doctors?status=${status}`);
    cachedDoctors = doctors;

    // Update pending tab count
    if (status === "pending") {
      tabPending.innerText = `Pending - ${doctors.length}`;
    }

    if (!doctors || doctors.length === 0) {
      doctorsListContainer.innerHTML = `
        <div class="empty-approvals-box">
          <div class="empty-icon">✓</div>
          <div class="empty-title">No ${status} requests</div>
          <div class="empty-desc">
            ${
              status === "pending"
                ? "All doctor registration applications have been reviewed."
                : `There are currently no ${status} doctor applications.`
            }
          </div>
        </div>
      `;
      return;
    }

    doctorsListContainer.innerHTML = doctors
      .map((doc) => {
        const isPending = doc.status === "pending";
        const isApproved = doc.status === "approved";
        const isRejected = doc.status === "rejected";

        return `
          <div class="doctor-card" id="docCard-${doc.id}">
            <div class="doctor-card-top">
              <div class="doctor-avatar">👤</div>
              <div class="doctor-headline">
                <div class="doctor-name">${doc.fullName}</div>
                <div class="doctor-sub">${doc.specialty} · ${doc.qualifications || "MBBS"}</div>
              </div>
              <span class="status-pill ${doc.status}">
                ${doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
              </span>
            </div>

            <div class="doctor-info-grid">
              <div>
                <div class="info-item-label">License no.</div>
                <div class="info-item-value">${doc.slmcNo}</div>
              </div>
              <div>
                <div class="info-item-label">Experience</div>
                <div class="info-item-value">${doc.experience || "Not specified"}</div>
              </div>
            </div>

            <button class="btn-view-docs" onclick="openDoctorDetails('${doc.id}')">
              View details & documents
            </button>

            ${
              isPending
                ? `
              <div class="card-action-row">
                <button class="btn-card-approve" onclick="openConfirmModal('${doc.id}', '${escapeHtml(doc.fullName)}', 'approved')">
                  Approve
                </button>
                <button class="btn-card-reject" onclick="openConfirmModal('${doc.id}', '${escapeHtml(doc.fullName)}', 'rejected')">
                  Reject
                </button>
              </div>
            `
                : isApproved
                  ? `<div style="font-size: 12px; color: #16a34a; font-weight: 700; text-align: center; padding: 4px;">✓ Doctor is approved and active in hospital catalogue</div>`
                  : `<div style="font-size: 12px; color: #dc2626; font-weight: 700; text-align: center; padding: 4px;">✕ Application rejected: ${doc.rejectionReason || "Credentials not approved"}</div>`
            }
          </div>
        `;
      })
      .join("");
  } catch (err) {
    doctorsListContainer.innerHTML = `<div style="padding: 20px; color: #dc2626; text-align: center; font-size: 13px;">Error: ${err.message}</div>`;
  }
}

function escapeHtml(str) {
  return (str || "").replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

// ──────────────── 4. DOCTOR DETAILS MODAL ────────────────
window.openDoctorDetails = (docId) => {
  const doc = cachedDoctors.find((d) => d.id === docId);
  if (!doc) return;

  doctorDetailsBody.innerHTML = `
    <div style="display: flex; align-items: center; margin-bottom: 16px;">
      <div class="doctor-avatar" style="width: 52px; height: 52px; font-size: 24px;">👤</div>
      <div style="flex: 1; margin-left: 12px;">
        <div style="font-size: 16px; font-weight: 800; color: #102e57;">${doc.fullName}</div>
        <div style="font-size: 13px; color: #0284c7; font-weight: 600;">${doc.specialty}</div>
        <div style="font-size: 12px; color: #64748b;">${doc.hospital}</div>
      </div>
      <span class="status-pill ${doc.status}">${doc.status}</span>
    </div>

    <div style="background: #f8fafc; border-radius: 12px; padding: 12px; border: 1px solid #e2e8f0; margin-bottom: 14px;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px;">
        <div>
          <span style="color: #94a3b8; display: block;">Doctor ID:</span>
          <strong style="color: #1e293b;">${doc.doctorId}</strong>
        </div>
        <div>
          <span style="color: #94a3b8; display: block;">SLMC Number:</span>
          <strong style="color: #1e293b;">${doc.slmcNo}</strong>
        </div>
        <div>
          <span style="color: #94a3b8; display: block;">NIC / Passport:</span>
          <strong style="color: #1e293b;">${doc.nic}</strong>
        </div>
        <div>
          <span style="color: #94a3b8; display: block;">Experience:</span>
          <strong style="color: #1e293b;">${doc.experience}</strong>
        </div>
        <div>
          <span style="color: #94a3b8; display: block;">Date of Birth:</span>
          <strong style="color: #1e293b;">${doc.dob}</strong>
        </div>
        <div>
          <span style="color: #94a3b8; display: block;">Gender:</span>
          <strong style="color: #1e293b;">${doc.gender}</strong>
        </div>
      </div>
    </div>

    <div style="font-size: 13px; margin-bottom: 12px;">
      <span style="color: #64748b; font-size: 12px; display: block; margin-bottom: 2px;">Qualifications:</span>
      <div style="color: #1e293b; font-weight: 600;">${doc.qualifications}</div>
    </div>

    <div style="font-size: 13px; margin-bottom: 14px;">
      <span style="color: #64748b; font-size: 12px; display: block; margin-bottom: 2px;">Contact Information:</span>
      <div style="color: #1e293b;">Phone: <strong>${doc.phone}</strong></div>
      <div style="color: #1e293b;">Email: <strong>${doc.email}</strong></div>
    </div>

    <div style="border-top: 1px solid #f1f5f9; padding-top: 12px; margin-bottom: 16px;">
      <span style="color: #64748b; font-size: 12px; display: block; margin-bottom: 4px;">Uploaded License Document:</span>
      <div style="display: flex; align-items: center; background: #f0f7ff; padding: 10px; border-radius: 8px; border: 1px solid #bfdbfe;">
        <span style="font-size: 18px; margin-right: 8px;">📄</span>
        <div style="flex: 1; font-size: 12px; color: #1e293b; font-weight: 600;">
          ${doc.licenseUrl || "medical_council_license_verified.pdf"}
        </div>
        <span style="font-size: 11px; background: #dcfce7; color: #15803d; font-weight: 700; padding: 2px 6px; border-radius: 4px;">ATTACHED</span>
      </div>
    </div>

    ${
      doc.status === "pending"
        ? `
      <div style="display: flex; gap: 8px;">
        <button class="btn-card-approve" onclick="closeDoctorDetailsModal.click(); openConfirmModal('${doc.id}', '${escapeHtml(doc.fullName)}', 'approved')">
          Approve Registration
        </button>
        <button class="btn-card-reject" onclick="closeDoctorDetailsModal.click(); openConfirmModal('${doc.id}', '${escapeHtml(doc.fullName)}', 'rejected')">
          Reject Registration
        </button>
      </div>
    `
        : ""
    }
  `;

  doctorDetailsModal.style.display = "flex";
};

closeDoctorDetailsModal.addEventListener("click", () => {
  doctorDetailsModal.style.display = "none";
});

// ──────────────── 5. CONFIRMATION DIALOG ────────────────
window.openConfirmModal = (docId, docName, status) => {
  pendingAction = { type: "doctor", docId, docName, status };

  if (status === "approved") {
    confirmActionTitle.innerText = "Approve Doctor Registration";
    confirmActionMessage.innerHTML = `Are you sure you want to approve <strong>${docName}</strong>?<br><br>This will create their official catalogue entry in the hospital directory and grant them doctor login access.`;
    rejectReasonBox.style.display = "none";
    executeConfirmBtn.innerText = "Confirm Approve";
    executeConfirmBtn.style.background = "#102e57";
  } else {
    confirmActionTitle.innerText = "Reject Doctor Registration";
    confirmActionMessage.innerHTML = `Are you sure you want to reject the registration application for <strong>${docName}</strong>?`;
    rejectReasonBox.style.display = "block";
    rejectionReasonInput.value = "";
    executeConfirmBtn.innerText = "Confirm Reject";
    executeConfirmBtn.style.background = "#dc2626";
  }

  confirmActionModal.style.display = "flex";
};

window.openNurseConfirmModal = (nurseId, nurseName, action) => {
  pendingAction = { type: "nurse", nurseId, nurseName, action };

  if (action === "approve") {
    confirmActionTitle.innerText = "Approve Nurse Registration";
    confirmActionMessage.innerHTML = `Are you sure you want to approve <strong>${nurseName}</strong>?<br><br>This will activate their account and grant them nurse login access to assigned OPD queue and patients.`;
    rejectReasonBox.style.display = "none";
    executeConfirmBtn.innerText = "Confirm Approve";
    executeConfirmBtn.style.background = "#102e57";
  } else {
    confirmActionTitle.innerText = "Reject Nurse Registration";
    confirmActionMessage.innerHTML = `Are you sure you want to reject the nurse registration for <strong>${nurseName}</strong>?`;
    rejectReasonBox.style.display = "block";
    rejectionReasonInput.value = "";
    executeConfirmBtn.innerText = "Confirm Reject";
    executeConfirmBtn.style.background = "#dc2626";
  }

  confirmActionModal.style.display = "flex";
};

cancelConfirmBtn.addEventListener("click", () => {
  confirmActionModal.style.display = "none";
  pendingAction = null;
});

executeConfirmBtn.addEventListener("click", async () => {
  if (!pendingAction) return;

  executeConfirmBtn.disabled = true;
  executeConfirmBtn.innerText = "Updating...";

  try {
    if (pendingAction.type === "nurse") {
      const { nurseId, action } = pendingAction;
      const reason = rejectionReasonInput.value.trim() || undefined;

      if (action === "approve") {
        await apiRequest(`/nurses/${nurseId}/approve`, "PATCH");
      } else {
        await apiRequest(`/nurses/${nurseId}/reject`, "PATCH", { reason });
      }

      confirmActionModal.style.display = "none";
      if (nurseDetailsModal) nurseDetailsModal.style.display = "none";
      pendingAction = null;

      await loadNursesList(currentNurseTab);
      await loadDashboardData();
      return;
    }

    const { docId, status } = pendingAction;
    const reason = rejectionReasonInput.value.trim() || undefined;
    await apiRequest(`/doctors/${docId}/status`, "PATCH", { status, reason });
    confirmActionModal.style.display = "none";
    if (doctorDetailsModal) doctorDetailsModal.style.display = "none";
    pendingAction = null;

    // Refresh list and dashboard metrics
    await loadDoctorsList(currentTab);
    await loadDashboardData();
  } catch (err) {
    alert(`Status update failed: ${err.message}`);
  } finally {
    executeConfirmBtn.disabled = false;
    executeConfirmBtn.innerText = "Confirm";
  }
});

// Close modals when clicking backdrop
window.addEventListener("click", (e) => {
  if (e.target === doctorDetailsModal) doctorDetailsModal.style.display = "none";
  if (e.target === nurseDetailsModal) nurseDetailsModal.style.display = "none";
  if (e.target === confirmActionModal) confirmActionModal.style.display = "none";
});

// ──────────────── 6. DASHBOARD & GLOBAL NAVIGATION ────────────────
reviewBtn.addEventListener("click", () => showApprovals("pending"));
if (viewReportsBtn) viewReportsBtn.addEventListener("click", () => showReports("daily"));
navHome.addEventListener("click", () => showDashboard());
navApprovals.addEventListener("click", () => showApprovals("pending"));
if (navReports) navReports.addEventListener("click", () => showReports("daily"));
if (navReportsFromApprovals) navReportsFromApprovals.addEventListener("click", () => showReports("daily"));

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("careplus_admin_token");
  localStorage.removeItem("careplus_admin_user");
  currentToken = null;
  currentAdmin = null;
  showLogin();
});

if (refreshBtn) refreshBtn.addEventListener("click", () => loadDashboardData());

// ──────────────── 7. REPORTS SCREEN (Figma 4.12) ────────────────
let currentReportPeriod = "daily";
let cachedReportData = null;

function switchReportTab(period) {
  currentReportPeriod = period;
  if (tabDaily) tabDaily.classList.toggle("active", period === "daily");
  if (tabWeekly) tabWeekly.classList.toggle("active", period === "weekly");
  if (tabMonthly) tabMonthly.classList.toggle("active", period === "monthly");
  loadReportData(period);
}

if (tabDaily) tabDaily.addEventListener("click", () => switchReportTab("daily"));
if (tabWeekly) tabWeekly.addEventListener("click", () => switchReportTab("weekly"));
if (tabMonthly) tabMonthly.addEventListener("click", () => switchReportTab("monthly"));

if (backToDashFromReportsBtn) backToDashFromReportsBtn.addEventListener("click", () => showDashboard());
if (navHomeFromReports) navHomeFromReports.addEventListener("click", () => showDashboard());
if (navApprovalsFromReports) navApprovalsFromReports.addEventListener("click", () => showApprovals("pending"));
if (navProfileFromReports) navProfileFromReports.addEventListener("click", () => logoutBtn.click());

async function loadReportData(period = "daily") {
  try {
    volumeBarChart.innerHTML = '<div style="font-size: 10px; color: #94a3b8; text-align: center; width: 100%; padding-top: 15px;">Loading...</div>';
    waitTimeLineChart.innerHTML = '<div style="font-size: 10px; color: #94a3b8; text-align: center; width: 100%; padding-top: 15px;">Loading...</div>';

    const data = await apiRequest(`/reports?period=${period}`);
    cachedReportData = data;

    // Subtitle & Header Date
    if (reportsDateRange) reportsDateRange.innerText = data.dateRange || "Period Overview";
    if (summaryDateTag) summaryDateTag.innerText = data.summaryDateTag || "";

    // 1. Appointment Volume Bar Chart
    const buckets = data.charts?.appointmentVolume?.buckets || [];
    const maxCount = Math.max(...buckets.map((b) => b.count), 1);

    volumeBarChart.innerHTML = buckets
      .map((b) => {
        const heightPct = b.count > 0 ? Math.max(20, Math.round((b.count / maxCount) * 100)) : 8;
        return `
          <div class="chart-bar-col" title="${b.label}: ${b.count} appointments">
            <div class="chart-bar-fill ${b.isPeak ? "peak" : ""}" style="height: ${heightPct}%;"></div>
            <span class="chart-bar-label">${b.label.slice(0, 3)}</span>
          </div>
        `;
      })
      .join("");

    if (volumeSubtitle) volumeSubtitle.innerText = data.charts?.appointmentVolume?.subtitle || "0 appointments";

    // 2. Average Wait Time Line Chart (SVG)
    const points = data.charts?.averageWaitTime?.points || [10, 15, 12, 18, 14, 11];
    const minVal = Math.min(...points, 5);
    const maxVal = Math.max(...points, 25);
    const range = maxVal - minVal || 1;

    const svgWidth = 140;
    const svgHeight = 44;
    const stepX = svgWidth / (points.length - 1);

    const coords = points.map((p, i) => {
      const x = Math.round(i * stepX);
      const y = Math.round(svgHeight - ((p - minVal) / range) * (svgHeight - 12) - 6);
      return { x, y };
    });

    const polylinePoints = coords.map((c) => `${c.x},${c.y}`).join(" ");
    const lastCoord = coords[coords.length - 1];

    waitTimeLineChart.innerHTML = `
      <svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" style="overflow: visible;">
        <polyline points="${polylinePoints}" fill="none" stroke="#ea580c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        <circle cx="${lastCoord.x}" cy="${lastCoord.y}" r="3.5" fill="#ea580c" stroke="#ffffff" stroke-width="1.5" />
      </svg>
    `;

    if (waitSubtitle) waitSubtitle.innerText = data.charts?.averageWaitTime?.subtitle || "Avg: N/A";

    // 3. Middle Metric Cards
    if (noShowRateVal) noShowRateVal.innerText = data.metrics?.noShowRate ?? "0.0%";
    if (noShowBadge) noShowBadge.innerText = `${data.metrics?.cancelledAppointments ?? 0} cancelled`;

    if (peakHoursVal) peakHoursVal.innerText = data.metrics?.peakHours ?? "N/A";
    if (peakHoursBadge) peakHoursBadge.innerText = data.metrics?.busiestDay ?? "Busiest: N/A";

    // 4. Dark Summary Card
    if (summaryCancelledCount) summaryCancelledCount.innerText = data.summary?.cancelledAppointments ?? 0;

  } catch (err) {
    console.error("Failed to load report data:", err);
    if (volumeSubtitle) volumeSubtitle.innerText = "Error loading";
    if (waitSubtitle) waitSubtitle.innerText = "Error loading";
  }
}

// ──────────────── 8. CSV EXPORT ────────────────
if (exportReportBtn) {
  exportReportBtn.addEventListener("click", () => {
    if (!cachedReportData) {
      alert("No report data available to export.");
      return;
    }

    const { period, dateRange, metrics, summary, appointments } = cachedReportData;

    let csvContent = "";

    // Title & Header info
    csvContent += `"CarePlus Hospital - Administrator Report"\n`;
    csvContent += `"Period","${period.toUpperCase()}"\n`;
    csvContent += `"Date Range","${dateRange}"\n`;
    csvContent += `"Generated At","${new Date().toLocaleString()}"\n\n`;

    // Summary Metrics Table
    csvContent += `"METRICS OVERVIEW"\n`;
    csvContent += `"Metric","Value"\n`;
    csvContent += `"Total Appointments","${metrics.totalAppointments}"\n`;
    csvContent += `"Completed Appointments","${metrics.completedAppointments}"\n`;
    csvContent += `"Cancelled Appointments","${metrics.cancelledAppointments}"\n`;
    csvContent += `"Waiting Appointments","${metrics.waitingAppointments}"\n`;
    csvContent += `"Average Wait / Duration","${metrics.averageWaitTime}"\n`;
    csvContent += `"No-Show Rate","${metrics.noShowRate}"\n`;
    csvContent += `"Peak Hours","${metrics.peakHours}"\n`;
    csvContent += `"Busiest Day","${metrics.busiestDay}"\n`;
    csvContent += `"Total Revenue","${summary.totalRevenue}"\n`;
    csvContent += `"Patient Satisfaction","${summary.patientSatisfaction}"\n`;
    csvContent += `"Staff Utilization","${summary.staffUtilization}"\n\n`;

    // Individual Appointment Details Table
    csvContent += `"APPOINTMENT RECORDS"\n`;
    csvContent += `"Appointment ID","Patient Name","Patient Phone","Doctor","Department","Date","Time","Status"\n`;

    if (appointments && appointments.length > 0) {
      appointments.forEach((a) => {
        csvContent += `"${a.appointmentId}","${a.patientName}","${a.patientPhone}","${a.doctorName}","${a.department}","${a.date}","${a.time}","${a.status}"\n`;
      });
    } else {
      csvContent += `"No appointments recorded for this period."\n`;
    }

    // Trigger browser download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const filename = `CarePlus_Report_${period}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });
}

// ──────────────── 3C. NURSE MANAGEMENT LOGIC ────────────────
function switchNurseTab(tab) {
  currentNurseTab = tab;
  if (tabNursePending) tabNursePending.classList.toggle("active", tab === "pending");
  if (tabNurseActive) tabNurseActive.classList.toggle("active", tab === "active");
  if (tabNurseRejected) tabNurseRejected.classList.toggle("active", tab === "rejected");
  if (tabNurseAll) tabNurseAll.classList.toggle("active", tab === "all");
  loadNursesList(tab);
}

if (tabNursePending) tabNursePending.addEventListener("click", () => switchNurseTab("pending"));
if (tabNurseActive) tabNurseActive.addEventListener("click", () => switchNurseTab("active"));
if (tabNurseRejected) tabNurseRejected.addEventListener("click", () => switchNurseTab("rejected"));
if (tabNurseAll) tabNurseAll.addEventListener("click", () => switchNurseTab("all"));

if (backToDashFromNursesBtn) backToDashFromNursesBtn.addEventListener("click", () => showDashboard());
if (navHomeFromNurses) navHomeFromNurses.addEventListener("click", () => showDashboard());
if (navApprovalsFromNurses) navApprovalsFromNurses.addEventListener("click", () => showApprovals());
if (navReportsFromNurses) navReportsFromNurses.addEventListener("click", () => showReports());
if (navProfileFromNurses) navProfileFromNurses.addEventListener("click", () => logoutBtn.click());

if (navNurses) navNurses.addEventListener("click", () => showNurses("pending"));
if (navNursesFromApprovals) navNursesFromApprovals.addEventListener("click", () => showNurses("pending"));
if (navNursesFromReports) navNursesFromReports.addEventListener("click", () => showNurses("pending"));
if (metricCardNurses) metricCardNurses.addEventListener("click", () => showNurses("active"));
if (reviewNursesBtn) reviewNursesBtn.addEventListener("click", () => showNurses("pending"));

if (closeNurseDetailsModal) {
  closeNurseDetailsModal.addEventListener("click", () => {
    if (nurseDetailsModal) nurseDetailsModal.style.display = "none";
  });
}

async function loadNursesList(status = "pending") {
  if (!nursesListContainer) return;
  nursesListContainer.innerHTML = '<div style="padding: 24px; text-align: center; color: #64748b;">Loading nurse records...</div>';

  try {
    const nurses = await apiRequest(`/nurses?status=${status}`);
    cachedNurses = Array.isArray(nurses) ? nurses : [];

    if (status === "pending" && tabNursePending) {
      tabNursePending.innerText = `Pending - ${cachedNurses.length}`;
    }

    if (!cachedNurses || cachedNurses.length === 0) {
      nursesListContainer.innerHTML = `
        <div class="empty-approvals-box">
          <div class="empty-icon">✓</div>
          <div class="empty-title">No ${status} nurse registrations</div>
          <div class="empty-desc">
            ${
              status === "pending"
                ? "All nurse applications have been reviewed."
                : `There are currently no ${status} nurse records.`
            }
          </div>
        </div>
      `;
      return;
    }

    nursesListContainer.innerHTML = cachedNurses
      .map((n) => {
        const isPending = n.status === "pending";
        const statusPillClass =
          n.status === "active" ? "approved" : n.status === "pending" ? "pending" : "rejected";

        return `
          <div class="doctor-card" id="nurseCard-${n.id}">
            <div class="doctor-card-top">
              <div class="doctor-avatar" style="background: #e0f2fe; color: #0369a1;">🩺</div>
              <div class="doctor-headline">
                <div class="doctor-name">${escapeHtml(n.fullName)}</div>
                <div class="doctor-sub">${escapeHtml(n.department)} · Ward: ${escapeHtml(n.ward || "General")}</div>
              </div>
              <span class="status-pill ${statusPillClass}">
                ${n.status.charAt(0).toUpperCase() + n.status.slice(1)}
              </span>
            </div>

            <div class="doctor-info-grid">
              <div>
                <div class="info-item-label">Staff ID</div>
                <div class="info-item-value">${escapeHtml(n.nurseId)}</div>
              </div>
              <div>
                <div class="info-item-label">Hospital</div>
                <div class="info-item-value">${escapeHtml(n.hospitalName || "CarePlus Hospital")}</div>
              </div>
              <div>
                <div class="info-item-label">Phone</div>
                <div class="info-item-value">${escapeHtml(n.phone)}</div>
              </div>
              <div>
                <div class="info-item-label">Registered</div>
                <div class="info-item-value">${n.createdAt ? new Date(n.createdAt).toLocaleDateString("en-GB") : "Recently"}</div>
              </div>
            </div>

            ${
              n.status === "rejected" && n.rejectionReason
                ? `
              <div style="margin: 8px 0; padding: 8px 12px; background: #fef2f2; border-left: 3px solid #dc2626; border-radius: 4px; font-size: 11px; color: #991b1b;">
                <strong>Rejection Reason:</strong> ${escapeHtml(n.rejectionReason)}
              </div>
            `
                : ""
            }

            <button class="btn-view-docs" onclick="openNurseDetails('${n.id}')">
              View details & profile
            </button>

            ${
              isPending
                ? `
              <div class="card-action-row">
                <button class="btn-card-approve" onclick="openNurseConfirmModal('${n.id}', '${escapeHtml(n.fullName)}', 'approve')">
                  Approve
                </button>
                <button class="btn-card-reject" onclick="openNurseConfirmModal('${n.id}', '${escapeHtml(n.fullName)}', 'reject')">
                  Reject
                </button>
              </div>
            `
                : ""
            }
          </div>
        `;
      })
      .join("");
  } catch (err) {
    nursesListContainer.innerHTML = `<div style="padding: 20px; color: #dc2626; text-align: center; font-size: 13px;">Error loading nurses: ${err.message}</div>`;
  }
}

window.openNurseDetails = (nurseId) => {
  const n = cachedNurses.find((item) => item.id === nurseId);
  if (!n) return;

  const regDate = n.createdAt ? new Date(n.createdAt).toLocaleString("en-GB") : "Recently";
  const statusPillClass =
    n.status === "active" ? "approved" : n.status === "pending" ? "pending" : "rejected";

  nurseDetailsBody.innerHTML = `
    <div style="display: flex; align-items: center; margin-bottom: 16px;">
      <div class="doctor-avatar" style="width: 52px; height: 52px; font-size: 24px; background: #e0f2fe; color: #0369a1;">🩺</div>
      <div style="flex: 1; margin-left: 12px;">
        <div style="font-size: 16px; font-weight: 800; color: #102e57;">${escapeHtml(n.fullName)}</div>
        <div style="font-size: 13px; color: #0284c7; font-weight: 600;">Staff ID: ${escapeHtml(n.nurseId)}</div>
        <div style="font-size: 12px; color: #64748b;">${escapeHtml(n.hospitalName || "CarePlus Hospital")}</div>
      </div>
      <span class="status-pill ${statusPillClass}">${n.status}</span>
    </div>

    <div style="background: #f8fafc; border-radius: 12px; padding: 12px; border: 1px solid #e2e8f0; margin-bottom: 14px;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px;">
        <div>
          <span style="color: #94a3b8; display: block;">Department:</span>
          <strong style="color: #1e293b;">${escapeHtml(n.department)}</strong>
        </div>
        <div>
          <span style="color: #94a3b8; display: block;">Ward:</span>
          <strong style="color: #1e293b;">${escapeHtml(n.ward || "General")}</strong>
        </div>
        <div>
          <span style="color: #94a3b8; display: block;">NIC:</span>
          <strong style="color: #1e293b;">${escapeHtml(n.nic)}</strong>
        </div>
        <div>
          <span style="color: #94a3b8; display: block;">Gender:</span>
          <strong style="color: #1e293b;">${escapeHtml(n.gender)}</strong>
        </div>
        <div>
          <span style="color: #94a3b8; display: block;">Date of Birth:</span>
          <strong style="color: #1e293b;">${escapeHtml(n.dateOfBirth)}</strong>
        </div>
        <div>
          <span style="color: #94a3b8; display: block;">Username:</span>
          <strong style="color: #1e293b;">${escapeHtml(n.username)}</strong>
        </div>
      </div>
    </div>

    <div style="font-size: 13px; margin-bottom: 14px;">
      <span style="color: #64748b; font-size: 12px; display: block; margin-bottom: 2px;">Contact Information:</span>
      <div style="color: #1e293b;">Phone: <strong>${escapeHtml(n.phone)}</strong></div>
      <div style="color: #1e293b;">Email: <strong>${escapeHtml(n.email)}</strong></div>
      <div style="color: #1e293b;">Address: <strong>${escapeHtml(n.address)}, ${escapeHtml(n.district)}</strong></div>
      <div style="color: #64748b; font-size: 11px; margin-top: 4px;">Registered on: ${regDate}</div>
    </div>

    ${
      n.status === "rejected" && n.rejectionReason
        ? `
      <div style="margin: 8px 0; padding: 10px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; font-size: 12px; color: #991b1b;">
        <strong>Rejection reason:</strong> ${escapeHtml(n.rejectionReason)}
      </div>
    `
        : ""
    }

    ${
      n.status === "pending"
        ? `
      <div style="display: flex; gap: 8px; margin-top: 16px;">
        <button style="flex: 1; padding: 12px; border-radius: 8px; border: none; background: #102e57; color: #fff; font-weight: 700; cursor: pointer;" onclick="openNurseConfirmModal('${n.id}', '${escapeHtml(n.fullName)}', 'approve')">
          Approve Nurse
        </button>
        <button style="flex: 1; padding: 12px; border-radius: 8px; border: 1px solid #dc2626; background: #fff; color: #dc2626; font-weight: 700; cursor: pointer;" onclick="openNurseConfirmModal('${n.id}', '${escapeHtml(n.fullName)}', 'reject')">
          Reject
        </button>
      </div>
    `
        : ""
    }
  `;

  if (nurseDetailsModal) nurseDetailsModal.style.display = "flex";
};

// Initial bootstrap check
if (currentToken) {
  showDashboard();
} else {
  showLogin();
}

