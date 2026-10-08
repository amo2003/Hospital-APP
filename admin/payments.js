// Admin-only fee management and receipt review. Receipt URLs require authentication.
const payIcon = (name) => {
  const paths = { back: '<path d="m14 6-6 6 6 6M8 12h12"/>', wallet: '<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 9h18m-6 5h3"/>', receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6m-6 4h6"/>', check: '<path d="m5 12 4 4L19 6"/>', close: '<path d="m6 6 12 12M6 18 18 6"/>', refresh: '<path d="M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-2l2 3M4 16l2 3a7 7 0 0 0 12-2"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>' };
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.receipt}</svg>`;
};
const paymentsView = document.createElement("section");
paymentsView.id = "paymentsView";
paymentsView.style.display = "none";
paymentsView.innerHTML = `
  <header class="pay-header">
    <button id="paymentsBack" class="pay-back">${payIcon("back")} Dashboard</button>
    <span class="pay-kicker">CAREPLUS / ADMIN PORTAL</span>
    <div class="pay-heading"><span class="pay-header-icon">${payIcon("wallet")}</span><div><h1>Fees &amp; payments</h1><p>Manage fees. Review payments with confidence.</p></div></div>
  </header>
  <div class="pay-content">
    <div class="pay-main-tabs" role="tablist" aria-label="Fees and payments">
      <button id="feesTab" role="tab" aria-controls="feesPanel" aria-selected="true">${payIcon("wallet")} Doctor fees</button>
      <button id="reviewsTab" role="tab" aria-controls="reviewsPanel" aria-selected="false" tabindex="-1">${payIcon("receipt")} Payment review</button>
    </div>
    <p id="paymentMessage" role="status" aria-live="polite" hidden></p>
    <section id="feesPanel" role="tabpanel" aria-labelledby="feesTab">
      <div class="pay-section-heading"><h2>Doctor appointment fees</h2><p>Set consultation fees and bank details for patients.</p></div>
      <form id="doctorFeeForm" class="pay-panel">
        <label for="feeDoctor">Select doctor</label><select id="feeDoctor" required><option value="">Choose a doctor</option></select>
        <div id="feeDoctorSummary" class="pay-doctor-summary" hidden></div>
        <label for="doctorFee">Appointment fee <span>(LKR)</span></label><div class="pay-money-input"><span>Rs.</span><input id="doctorFee" type="number" min="0" max="1000000" step="0.01" placeholder="0.00" required disabled></div>
        <label for="feeInstructions">Bank &amp; payment instructions</label><textarea id="feeInstructions" maxlength="2000" disabled placeholder="Bank name and branch&#10;Account name and number&#10;Payment reference instructions"></textarea>
        <p class="pay-note">Use LKR 0 for free appointments. Changes apply to new bookings only.</p>
        <button id="saveDoctorFee" class="pay-primary pay-full" disabled>${payIcon("check")} Save doctor fee</button>
      </form>
    </section>
    <section id="reviewsPanel" role="tabpanel" aria-labelledby="reviewsTab" hidden>
      <div class="pay-section-heading pay-row"><div><h2>Payment review</h2><p>Check receipts and update payment status.</p></div><button id="refreshPayments" class="pay-icon-button" aria-label="Refresh payments">${payIcon("refresh")}</button></div>
      <div class="pay-stats"><div><i class="pending"></i>Pending<strong id="pendingPaymentsCount">—</strong></div><div><i class="approved"></i>Approved<strong id="approvedPaymentsCount">—</strong></div><div><i class="rejected"></i>Rejected<strong id="rejectedPaymentsCount">—</strong></div></div>
      <div class="pay-panel pay-filters"><div><label for="paymentDoctor">Doctor</label><select id="paymentDoctor"><option value="">All doctors</option></select></div><div><label for="paymentDate">Appointment date</label><input id="paymentDate" type="date"></div></div>
      <div class="pay-status-tabs" role="group" aria-label="Filter payment status"><button data-status="pending" aria-pressed="true">Pending</button><button data-status="approved" aria-pressed="false">Approved</button><button data-status="rejected" aria-pressed="false">Rejected</button><button data-status="all" aria-pressed="false">All</button></div>
      <div class="pay-list-heading"><h3 id="paymentListTitle">Pending payments</h3><span id="paymentResultCount"></span></div>
      <div id="paymentList" aria-live="polite"></div>
      <div id="paymentPagination" class="pay-pagination" hidden><button id="paymentsPrevious">Previous</button><span id="paymentsPage"></span><button id="paymentsNext">Next</button></div>
      <p class="pay-time-note">All appointment and upload times are in Sri Lanka time.</p>
    </section>
  </div>
  <dialog id="paymentReviewDialog" class="pay-dialog" aria-labelledby="paymentDialogTitle">
    <div class="pay-dialog-header"><div><span class="pay-kicker">PAYMENT REVIEW</span><h2 id="paymentDialogTitle">Review payment slip</h2></div><button id="closePaymentReview" class="pay-icon-button" aria-label="Close review">${payIcon("close")}</button></div>
    <div class="pay-dialog-body"><div id="paymentReviewDetails"></div>
      <h3>Uploaded receipt</h3><div id="paymentPreview" class="pay-preview"></div>
      <button id="downloadReviewSlip" class="pay-full" disabled>Download original slip</button>
      <div id="paymentDecisionForm"><label class="pay-verify"><input id="paymentVerified" type="checkbox"><span>I checked the receipt and received the correct amount.</span></label>
        <label for="paymentRejectReason">Reason for rejection <span>(required to reject)</span></label><textarea id="paymentRejectReason" minlength="5" maxlength="500" placeholder="Explain what the patient needs to correct."></textarea>
        <p class="pay-time-note">The patient can see this reason. Rejecting a payment does not cancel the appointment.</p>
      </div>
      <p id="paymentReviewError" role="alert" hidden></p>
      <div id="paymentDecisionActions" class="pay-decision-actions"><button id="rejectPayment" class="pay-danger" disabled>${payIcon("close")} Reject payment</button><button id="approvePayment" class="pay-primary" disabled>${payIcon("check")} Approve payment</button></div>
    </div>
  </dialog>`;
document.querySelector(".app-viewport").append(paymentsView);
const payEl = (id) => document.getElementById(id);
const paySafe = (value) => escapeHtml(String(value ?? ""));
const payMoney = (value) => `LKR ${Number(value || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const sriLankaTime = (value) => value ? new Date(value).toLocaleString("en-GB", { timeZone: "Asia/Colombo", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Unavailable";
const canReviewPayment = (a) => a.payment.status === "pending" && a.status === "confirmed" && a.doctorDecision !== "rejected" && new Date(`${a.date}T${a.time}:00+05:30`).getTime() > Date.now();
const paymentBadge = (status) => `<span class="pay-badge ${["pending", "approved", "rejected"].includes(status) ? status : ""}">${paySafe({ pending: "Pending review", approved: "Approved", rejected: "Rejected" }[status] || status)}</span>`;
let feeDoctors = [], paymentItems = [], paymentPage = 1, paymentRequest = 0, previewRequest = 0;
let paymentStatus = "pending", selectedPayment = null, receiptUrl = null, receiptBlob = null, decisionBusy = false;
function paymentMessage(text, error = false) {
  payEl("paymentMessage").textContent = text; payEl("paymentMessage").hidden = !text;
  payEl("paymentMessage").className = error ? "pay-error" : "pay-success";
}
function setPaymentTab(tab, focus = false) {
  paymentMessage("");
  const fees = tab !== "reviews";
  payEl("feesPanel").hidden = !fees; payEl("reviewsPanel").hidden = fees;
  for (const [id, active] of [["feesTab", fees], ["reviewsTab", !fees]]) {
    payEl(id).setAttribute("aria-selected", String(active)); payEl(id).tabIndex = active ? 0 : -1;
    if (active && focus) payEl(id).focus();
  }
  if (!fees) loadPayments();
}
async function showPayments(tab = "fees") {
  if (!currentToken) return showLogin();
  [loginView, dashboardView, approvalsView, nursesView, reportsView].forEach((view) => { if (view) view.style.display = "none"; });
  paymentsView.style.display = "block";
  paymentMessage(""); paymentPage = 1; setPaymentTab(tab);
  try {
    feeDoctors = await apiRequest("/doctor-fees");
    for (const [id, placeholder] of [["feeDoctor", "Choose a doctor"], ["paymentDoctor", "All doctors"]]) {
      const select = payEl(id), previous = select.value;
      select.replaceChildren(new Option(placeholder, ""), ...feeDoctors.map((d) => new Option(`${d.name} — ${d.hospitalId?.name || d.specialty}`, d._id)));
      if (feeDoctors.some((d) => d._id === previous)) select.value = previous;
    }
    selectFeeDoctor();
  } catch (error) { paymentMessage(error.message, true); }
}
function selectFeeDoctor() {
  const doctor = feeDoctors.find((d) => d._id === payEl("feeDoctor").value);
  payEl("doctorFee").value = doctor ? Number(doctor.feeLkr || 0).toFixed(2) : "";
  payEl("feeInstructions").value = doctor?.paymentInstructions || "";
  ["doctorFee", "feeInstructions", "saveDoctorFee"].forEach((id) => { payEl(id).disabled = !doctor; });
  payEl("feeDoctorSummary").hidden = !doctor;
  if (doctor) payEl("feeDoctorSummary").innerHTML = `<span class="pay-avatar">${payIcon("user")}</span><div><strong>${paySafe(doctor.name)}</strong><span>${paySafe(doctor.specialty)}</span><small>Current fee · ${payMoney(doctor.feeLkr)}</small></div>`;
}
payEl("doctorFeeForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const doctorId = payEl("feeDoctor").value, feeLkr = Number(payEl("doctorFee").value), paymentInstructions = payEl("feeInstructions").value.trim();
  if (!doctorId || !Number.isFinite(feeLkr) || feeLkr < 0 || feeLkr > 1000000) return paymentMessage("Choose a doctor and enter a valid fee.", true);
  if (feeLkr > 0 && paymentInstructions.length < 10) return paymentMessage("Enter the bank and account instructions for this fee.", true);
  const controls = ["saveDoctorFee", "feeDoctor", "doctorFee", "feeInstructions"];
  controls.forEach((id) => { payEl(id).disabled = true; });
  try {
    const updated = await apiRequest(`/doctor-fees/${doctorId}`, "PATCH", { feeLkr, paymentInstructions });
    feeDoctors = feeDoctors.map((doctor) => doctor._id === doctorId ? { ...doctor, feeLkr: updated.feeLkr, paymentInstructions: updated.paymentInstructions } : doctor);
    selectFeeDoctor(); paymentMessage("Doctor fee saved. New bookings will use this amount.");
  } catch (error) { paymentMessage(error.message, true); }
  finally { controls.forEach((id) => { payEl(id).disabled = false; }); }
});
async function loadPayments() {
  const requestId = ++paymentRequest;
  payEl("paymentList").innerHTML = '<div class="pay-empty">Loading payment slips…</div>';
  payEl("paymentPagination").hidden = true; payEl("paymentResultCount").textContent = "";
  payEl("paymentListTitle").textContent = { pending: "Pending payments", approved: "Approved payments", rejected: "Rejected payments", all: "All payments" }[paymentStatus];
  const query = new URLSearchParams({ status: paymentStatus, page: String(paymentPage) });
  if (payEl("paymentDoctor").value) query.set("doctorId", payEl("paymentDoctor").value);
  if (payEl("paymentDate").value) query.set("date", payEl("paymentDate").value);
  try {
    const data = await apiRequest(`/payments?${query}`);
    if (requestId !== paymentRequest) return;
    paymentItems = data.items;
    for (const status of ["pending", "approved", "rejected"]) payEl(`${status}PaymentsCount`).textContent = data.counts?.[status] ?? "—";
    payEl("paymentResultCount").textContent = `${data.total} ${data.total === 1 ? "payment" : "payments"}`;
    payEl("paymentPagination").hidden = data.total <= 30;
    payEl("paymentsPage").textContent = `${data.page} / ${Math.max(1, Math.ceil(data.total / 30))}`;
    payEl("paymentsPrevious").disabled = data.page <= 1; payEl("paymentsNext").disabled = data.page * 30 >= data.total;
    payEl("paymentList").innerHTML = data.items.length ? data.items.map((a) => `<article class="pay-panel pay-card">
      <div class="pay-row">${paymentBadge(a.payment.status)}<span class="pay-reference">${paySafe(a.appointmentId)}</span></div>
      <div class="pay-patient-row"><span class="pay-avatar">${payIcon("user")}</span><div><h3>${paySafe(a.patientId?.fullName || "Patient unavailable")}</h3><span>${paySafe(a.patientId?.patientId)}</span></div><strong>${payMoney(a.payment.amountLkr)}</strong></div>
      <dl class="pay-details"><div><dt>Doctor</dt><dd>${paySafe(a.doctorId?.name || "Doctor unavailable")}</dd></div><div><dt>Appointment</dt><dd>${paySafe(a.date)} · ${paySafe(a.time)}</dd></div><div><dt>Uploaded</dt><dd>${paySafe(sriLankaTime(a.payment.slipId?.uploadedAt))}</dd></div></dl>
      <button class="pay-full ${canReviewPayment(a) ? "pay-primary" : ""}" data-review="${paySafe(a._id)}">${payIcon("receipt")} ${canReviewPayment(a) ? "Review slip" : "View payment details"}</button>
    </article>`).join("") : `<div class="pay-empty">${payIcon("receipt")}<strong>No ${paymentStatus === "all" ? "" : paymentStatus + " "}payments</strong><p>Payment slips matching these filters will appear here.</p></div>`;
  } catch (error) {
    if (requestId !== paymentRequest) return;
    paymentItems = []; payEl("paymentList").innerHTML = '<div class="pay-empty">Could not load payments. Use the refresh button to retry.</div>';
    paymentMessage(error.message, true);
  }
}
function releaseReceipt() {
  previewRequest++;
  if (receiptUrl) URL.revokeObjectURL(receiptUrl);
  receiptUrl = null; receiptBlob = null;
}
function reviewError(text = "") { payEl("paymentReviewError").textContent = text; payEl("paymentReviewError").hidden = !text; }
function updateReviewButtons() {
  payEl("approvePayment").disabled = decisionBusy || !receiptUrl || !payEl("paymentVerified").checked;
  payEl("rejectPayment").disabled = decisionBusy || !receiptUrl;
  ["closePaymentReview", "paymentVerified", "paymentRejectReason"].forEach((id) => { payEl(id).disabled = decisionBusy; });
}
async function openPaymentReview(id) {
  const a = paymentItems.find((item) => item._id === id);
  if (!a) return;
  releaseReceipt(); selectedPayment = a;
  const request = previewRequest;
  reviewError(); payEl("paymentVerified").checked = false; payEl("paymentRejectReason").value = "";
  payEl("downloadReviewSlip").disabled = true;
  payEl("paymentDecisionForm").hidden = !canReviewPayment(a); payEl("paymentDecisionActions").hidden = !canReviewPayment(a);
  payEl("paymentReviewDetails").innerHTML = `<div class="pay-row">${paymentBadge(a.payment.status)}<strong>${payMoney(a.payment.amountLkr)}</strong></div><dl class="pay-details">
    <div><dt>Patient</dt><dd>${paySafe(a.patientId?.fullName)}<small>${paySafe(a.patientId?.patientId)}</small></dd></div>
    <div><dt>Doctor</dt><dd>${paySafe(a.doctorId?.name)}</dd></div><div><dt>Hospital</dt><dd>${paySafe(a.hospitalId?.name)}</dd></div>
    <div><dt>Appointment</dt><dd>${paySafe(a.date)} · ${paySafe(a.time)}<small>${paySafe(a.appointmentId)}</small></dd></div>
    <div><dt>Uploaded</dt><dd>${paySafe(sriLankaTime(a.payment.slipId?.uploadedAt))}</dd></div>
    <div><dt>Booking status</dt><dd>${paySafe(a.status)}</dd></div>
    ${a.payment.reviewedAt ? `<div><dt>Reviewed</dt><dd>${paySafe(sriLankaTime(a.payment.reviewedAt))}</dd></div>` : ""}</dl>
    ${a.payment.rejectionReason ? `<p class="pay-rejection"><strong>Rejection reason</strong>${paySafe(a.payment.rejectionReason)}</p>` : ""}
    ${a.payment.status === "pending" && !canReviewPayment(a) ? '<p class="pay-note">Only active, upcoming appointments can be reviewed.</p>' : ""}`;
  payEl("paymentPreview").textContent = "Loading receipt…";
  updateReviewButtons(); payEl("paymentReviewDialog").showModal();
  try {
    const response = await fetch(`${API_BASE}/payments/${id}/slip`, { headers: { Authorization: `Bearer ${currentToken}` } });
    if (response.status === 401) { payEl("paymentReviewDialog").close(); showLogin(); throw new Error("Please sign in again."); }
    if (!response.ok) throw new Error("Could not load this slip. Close the review and try again.");
    const blob = await response.blob();
    if (request !== previewRequest) return;
    receiptBlob = blob; receiptUrl = URL.createObjectURL(blob);
    if (/^image\/(jpeg|png)$/.test(blob.type)) {
      const img = document.createElement("img"); img.src = receiptUrl; img.alt = "Patient's uploaded payment slip";
      payEl("paymentPreview").replaceChildren(img);
    } else payEl("paymentPreview").innerHTML = `${payIcon("receipt")}<strong>PDF payment receipt</strong><span>Download the original file to review its details.</span>`;
    payEl("downloadReviewSlip").disabled = false; updateReviewButtons();
  } catch (error) { if (request === previewRequest) { payEl("paymentPreview").textContent = "Receipt unavailable"; reviewError(error.message); } }
}
async function decidePayment(decision) {
  if (!selectedPayment || decisionBusy || !receiptUrl || !canReviewPayment(selectedPayment)) return;
  const reason = payEl("paymentRejectReason").value.trim();
  if (decision === "reject" && reason.length < 5) { reviewError("Enter a rejection reason of at least 5 characters."); payEl("paymentRejectReason").focus(); return; }
  if (decision === "approve" && !payEl("paymentVerified").checked) return reviewError("Please verify the receipt before approving.");
  decisionBusy = true; reviewError(); updateReviewButtons();
  try {
    await apiRequest(`/payments/${selectedPayment._id}/${decision}`, "PATCH", decision === "reject" ? { reason } : null);
    payEl("paymentReviewDialog").close(); paymentPage = 1; await loadPayments();
    paymentMessage(decision === "approve" ? "Payment approved. The patient notification email is queued for delivery." : "Payment rejected. The patient can see your reason in their appointment details.");
  } catch (error) { reviewError(error.message); }
  finally { decisionBusy = false; updateReviewButtons(); }
}
payEl("viewPaymentsBtn").addEventListener("click", () => showPayments("fees"));
payEl("viewPaymentReviewsBtn").addEventListener("click", () => showPayments("reviews"));
payEl("feesTab").addEventListener("click", () => setPaymentTab("fees"));
payEl("reviewsTab").addEventListener("click", () => setPaymentTab("reviews"));
for (const id of ["feesTab", "reviewsTab"]) payEl(id).addEventListener("keydown", (event) => {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault(); setPaymentTab(event.key === "Home" ? "fees" : event.key === "End" ? "reviews" : id === "feesTab" ? "reviews" : "fees", true);
});
payEl("paymentsBack").addEventListener("click", showDashboard);
payEl("feeDoctor").addEventListener("change", selectFeeDoctor);
payEl("refreshPayments").addEventListener("click", () => { paymentPage = 1; paymentMessage(""); loadPayments(); });
for (const id of ["paymentDoctor", "paymentDate"]) payEl(id).addEventListener("change", () => { paymentPage = 1; loadPayments(); });
document.querySelectorAll(".pay-status-tabs button").forEach((button) => button.addEventListener("click", () => {
  paymentStatus = button.dataset.status; paymentPage = 1;
  document.querySelectorAll(".pay-status-tabs button").forEach((tab) => tab.setAttribute("aria-pressed", String(tab === button))); loadPayments();
}));
payEl("paymentsPrevious").addEventListener("click", () => { paymentPage = Math.max(1, paymentPage - 1); loadPayments(); });
payEl("paymentsNext").addEventListener("click", () => { paymentPage++; loadPayments(); });
payEl("paymentList").addEventListener("click", (event) => { const button = event.target.closest("[data-review]"); if (button) openPaymentReview(button.dataset.review); });
payEl("closePaymentReview").addEventListener("click", () => { if (!decisionBusy) payEl("paymentReviewDialog").close(); });
payEl("paymentReviewDialog").addEventListener("cancel", (event) => { if (decisionBusy) event.preventDefault(); });
payEl("paymentReviewDialog").addEventListener("close", () => { releaseReceipt(); selectedPayment = null; });
payEl("paymentVerified").addEventListener("change", updateReviewButtons);
payEl("paymentRejectReason").addEventListener("input", () => reviewError());
payEl("approvePayment").addEventListener("click", () => decidePayment("approve"));
payEl("rejectPayment").addEventListener("click", () => decidePayment("reject"));
payEl("downloadReviewSlip").addEventListener("click", () => {
  if (!receiptUrl || !selectedPayment) return;
  const link = document.createElement("a"); link.href = receiptUrl;
  link.download = `payment-slip-${selectedPayment.appointmentId}.${receiptBlob.type.includes("pdf") ? "pdf" : receiptBlob.type.includes("png") ? "png" : "jpg"}`;
  document.body.append(link); link.click(); link.remove();
});
