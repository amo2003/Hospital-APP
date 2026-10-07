// Separate from staff registration approvals: this screen verifies patient payments.
const paymentsView = document.createElement("section");
paymentsView.id = "paymentsView";
paymentsView.style.display = "none";
paymentsView.style.flexDirection = "column";
paymentsView.innerHTML = `
  <button id="paymentsBack">&larr; Dashboard</button>
  <h1>Fees &amp; payments</h1>
  <p>Set each doctor's appointment fee and review patients' bank payment slips.</p>
  <p id="paymentMessage" role="status" aria-live="polite"></p>
  <form id="doctorFeeForm" class="payment-panel">
    <h2>Doctor appointment fee</h2>
    <label for="feeDoctor">Doctor</label><select id="feeDoctor" required><option value="">Select doctor</option></select>
    <label for="doctorFee">Amount (LKR)</label><input id="doctorFee" type="number" min="0" max="1000000" step="0.01" required disabled>
    <label for="feeInstructions">Bank / account payment instructions</label><textarea id="feeInstructions" maxlength="2000" disabled placeholder="Bank name, branch, account name and number, payment reference instructions"></textarea>
    <p>Use 0 for free appointments. Fee changes apply to new bookings only.</p>
    <div class="payment-actions"><button id="saveDoctorFee" class="primary" disabled>Save fee</button></div>
  </form>
  <section class="payment-panel">
    <h2>Payment slips</h2>
    <label for="paymentDoctor">Doctor</label><select id="paymentDoctor"><option value="">All doctors</option></select>
    <label for="paymentStatus">Payment status</label><select id="paymentStatus"><option value="pending">Pending review</option><option value="approved">Approved</option><option value="all">All payments</option></select>
    <label for="paymentDate">Appointment date (optional)</label><input id="paymentDate" type="date">
    <div class="payment-actions"><button id="refreshPayments">Refresh slips</button></div>
  </section>
  <div id="paymentList" aria-live="polite"></div>
  <div class="payment-actions"><button id="paymentsPrevious">Previous</button><span id="paymentsPage"></span><button id="paymentsNext">Next</button></div>`;
document.querySelector(".app-viewport").append(paymentsView);
const payEl = (id) => document.getElementById(id);
let feeDoctors = [];
let paymentPage = 1;
let paymentRequest = 0;
function paymentMessage(text, error = false) {
  payEl("paymentMessage").textContent = text;
  payEl("paymentMessage").className = error ? "error" : "";
}
async function showPayments() {
  if (!currentToken) return showLogin();
  [loginView, dashboardView, approvalsView, nursesView, reportsView].forEach((view) => { if (view) view.style.display = "none"; });
  paymentsView.style.display = "flex";
  paymentMessage("");
  paymentPage = 1;
  try {
    feeDoctors = await apiRequest("/doctor-fees");
    for (const [selectId, placeholder] of [["feeDoctor", "Select doctor"], ["paymentDoctor", "All doctors"]]) {
      const select = payEl(selectId);
      const previous = select.value;
      select.replaceChildren(new Option(placeholder, ""), ...feeDoctors.map((d) => new Option(`${d.name} - ${d.hospitalId?.name || d.specialty}`, d._id)));
      if (feeDoctors.some((d) => d._id === previous)) select.value = previous;
    }
    selectFeeDoctor();
    await loadPayments();
  } catch (error) { paymentMessage(error.message, true); }
}
function selectFeeDoctor() {
  const doctor = feeDoctors.find((d) => d._id === payEl("feeDoctor").value);
  payEl("doctorFee").value = doctor ? (doctor.feeLkr || 0).toFixed(2) : "";
  payEl("feeInstructions").value = doctor?.paymentInstructions || "";
  ["doctorFee", "feeInstructions", "saveDoctorFee"].forEach((id) => { payEl(id).disabled = !doctor; });
}
payEl("doctorFeeForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const doctorId = payEl("feeDoctor").value;
  const feeLkr = Number(payEl("doctorFee").value);
  const paymentInstructions = payEl("feeInstructions").value.trim();
  if (feeLkr > 0 && paymentInstructions.length < 10) return paymentMessage("Enter bank/account payment instructions before saving a paid appointment fee.", true);
  payEl("saveDoctorFee").disabled = true;
  payEl("feeDoctor").disabled = true;
  try {
    const updated = await apiRequest(`/doctor-fees/${doctorId}`, "PATCH", { feeLkr, paymentInstructions });
    feeDoctors = feeDoctors.map((doctor) => doctor._id === doctorId ? { ...doctor, feeLkr: updated.feeLkr, paymentInstructions: updated.paymentInstructions } : doctor);
    paymentMessage("Doctor fee saved. New bookings will use this amount.");
  } catch (error) { paymentMessage(error.message, true); }
  finally { payEl("saveDoctorFee").disabled = false; payEl("feeDoctor").disabled = false; }
});
const sriLankaTime = (value) => value ? new Date(value).toLocaleString("en-GB", { timeZone: "Asia/Colombo" }) + " (Sri Lanka)" : "Unavailable";
async function loadPayments() {
  const requestId = ++paymentRequest;
  payEl("paymentList").textContent = "Loading payment slips...";
  const query = new URLSearchParams({ status: payEl("paymentStatus").value, page: String(paymentPage) });
  if (payEl("paymentDoctor").value) query.set("doctorId", payEl("paymentDoctor").value);
  if (payEl("paymentDate").value) query.set("date", payEl("paymentDate").value);
  try {
    const data = await apiRequest(`/payments?${query}`);
    if (requestId !== paymentRequest) return;
    payEl("paymentsPage").textContent = `Page ${data.page} / ${Math.max(1, Math.ceil(data.total / 30))}`;
    payEl("paymentsPrevious").disabled = data.page <= 1;
    payEl("paymentsNext").disabled = data.page * 30 >= data.total;
    payEl("paymentList").innerHTML = data.items.length ? data.items.map((appointment) => {
      const payment = appointment.payment;
      const active = appointment.status === "confirmed" && appointment.doctorDecision !== "rejected" && new Date(`${appointment.date}T${appointment.time}:00+05:30`).getTime() > Date.now();
      return `<article class="payment-panel">
        <span class="payment-badge">${payment.status === "approved" ? "Payment approved" : "Pending review"}</span>
        <h2>${escapeHtml(appointment.doctorId?.name || "Doctor unavailable")}</h2>
        <p><strong>${escapeHtml(appointment.patientId?.fullName || "Patient unavailable")}</strong> &middot; ${escapeHtml(appointment.patientId?.patientId || "")}</p>
        <p>${escapeHtml(appointment.hospitalId?.name || "")} &middot; ${escapeHtml(appointment.department)}</p>
        <p>Appointment: ${escapeHtml(appointment.date)} at ${escapeHtml(appointment.time)} (Sri Lanka)</p>
        <p>ID: ${escapeHtml(appointment.appointmentId)}</p>
        <p>Amount: <strong>LKR ${Number(payment.amountLkr).toFixed(2)}</strong></p>
        <p>Slip uploaded: ${escapeHtml(sriLankaTime(payment.slipId?.uploadedAt))}</p>
        <p>Booking status: ${escapeHtml(appointment.status)}</p>
        ${payment.reviewedAt ? `<p>Approved: ${escapeHtml(sriLankaTime(payment.reviewedAt))}</p>` : ""}
        <div class="payment-actions"><button data-slip="${appointment._id}">Download slip</button>
        ${payment.status === "pending" ? `<button class="primary" data-approve="${appointment._id}" ${active ? "" : "disabled"}>Approve payment</button>` : ""}</div>
      </article>`;
    }).join("") : "No payment slips match these filters.";
  } catch (error) {
    if (requestId !== paymentRequest) return;
    payEl("paymentList").textContent = "Could not load slips. Use Refresh slips to retry.";
    paymentMessage(error.message, true);
  }
}
payEl("paymentList").addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  button.disabled = true;
  paymentMessage("");
  try {
    if (button.dataset.slip) {
      const response = await fetch(`${API_BASE}/payments/${button.dataset.slip}/slip`, { headers: { Authorization: `Bearer ${currentToken}` } });
      if (response.status === 401) { showLogin(); throw new Error("Please sign in again."); }
      if (!response.ok) throw new Error("Payment slip could not be downloaded.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `payment-slip-${button.dataset.slip}.${blob.type.includes("pdf") ? "pdf" : "jpg"}`;
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } else if (button.dataset.approve) {
      if (!window.confirm("Confirm you have checked the slip and received the correct payment. Approve and email this patient?")) return;
      await apiRequest(`/payments/${button.dataset.approve}/approve`, "PATCH");
      await loadPayments();
      paymentMessage("Payment approved. The patient notification email is queued for delivery.");
    }
  } catch (error) { paymentMessage(error.message, true); }
  finally { button.disabled = false; }
});
payEl("viewPaymentsBtn").addEventListener("click", showPayments);
payEl("paymentsBack").addEventListener("click", showDashboard);
payEl("feeDoctor").addEventListener("change", selectFeeDoctor);
payEl("refreshPayments").addEventListener("click", () => { paymentPage = 1; loadPayments(); });
for (const id of ["paymentDoctor", "paymentStatus", "paymentDate"]) payEl(id).addEventListener("change", () => { paymentPage = 1; loadPayments(); });
payEl("paymentsPrevious").addEventListener("click", () => { paymentPage = Math.max(1, paymentPage - 1); loadPayments(); });
payEl("paymentsNext").addEventListener("click", () => { paymentPage++; loadPayments(); });
