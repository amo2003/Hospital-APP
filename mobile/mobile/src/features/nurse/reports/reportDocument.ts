import type { NurseReport } from "../types";

export const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

export function reportDocument(report: NurseReport, t: (value: string) => string, language: string) {
  const h = escapeHtml;
  const label = (value: string) => h(t(value));
  const missing = label("Not recorded");
  const bars = (items: { label: string; count: number }[]) => {
    const max = Math.max(1, ...items.map(item => item.count));
    return items.map(item => `<div class="chart-row"><div>${h(item.label)} <strong>${item.count}</strong></div><div class="track"><div class="bar" style="width:${item.count / max * 100}%"></div></div></div>`).join("");
  };
  const rows = report.records.map(record => `<tr><td>${h(record.date)}<br>${h(record.time) || missing}</td><td>${h(record.token)}</td><td>${h(record.patientName) || missing}<br><small>${h(record.patientId)}</small></td><td>${h(record.doctorName) || missing}<br><small>${h(record.department)}</small></td><td>${h(record.appointmentId) || missing}</td><td>${record.completedAt ? h(new Date(record.completedAt).toLocaleString(language === "en" ? "en-GB" : `${language}-LK`, { timeZone: "Asia/Colombo" })) : missing}</td></tr>`).join("");
  return `<!doctype html><html lang="${h(language)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>CarePlus-Queue-${h(report.from)}-${h(report.to)}</title><style>
    @page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#102e57;font-size:11px;line-height:1.5;margin:0}h1{font-size:24px;margin:0}h2{font-size:16px;margin-top:24px}header{border-bottom:3px solid #086ab9;padding-bottom:15px}.summary{display:flex;gap:12px;margin:20px 0}.stat{flex:1;background:#eef7ff;border:1px solid #cfe2f7;padding:12px;border-radius:8px}.stat strong{display:block;font-size:24px;color:#086ab9}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{text-align:left;padding:8px 5px;border-bottom:1px solid #dae7f3;overflow-wrap:anywhere;vertical-align:top}th{background:#eef7ff}thead{display:table-header-group}tr,.chart-row{break-inside:avoid}small,.muted{color:#526783}.chart-row{margin:8px 0}.chart-row strong{float:right}.track{height:10px;background:#eef2f6;border-radius:4px}.bar{height:10px;background:#086ab9;border-radius:4px}.toolbar{padding:14px;background:#eef7ff;margin-bottom:20px}button{background:#086ab9;color:white;border:0;border-radius:6px;padding:10px 20px;cursor:pointer}footer{margin-top:24px;border-top:1px solid #dae7f3;padding-top:10px}@media print{.toolbar{display:none}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    </style></head><body><header><div>CAREPLUS HOSPITAL · OPD</div><h1>${label("Completed queue report")}</h1><p>${h(report.hospital)} · ${label(report.department)}<br>${h(report.from)} — ${h(report.to)}</p><div class="muted">${label("Generated at")} ${h(new Date(report.generatedAt).toLocaleString("en-GB", { timeZone: "Asia/Colombo" }))} · Asia/Colombo</div></header>
    <div class="summary">${[["Completed visits", report.summary.completed], ["Unique patients", report.summary.patients], ["Doctors", report.summary.doctors], ["Average per day", report.summary.averagePerDay]].map(([title, count]) => `<div class="stat">${label(String(title))}<strong>${count}</strong></div>`).join("")}</div>
    <p>${label("Based on queue dates. Completed visits only.")}</p><h2>${label("Completed visits by day")}</h2>${bars(report.daily.map(item => ({ label: item.date, count: item.count })))}
    <h2>${label("Completed visits by doctor")}</h2>${bars(report.byDoctor.map(item => ({ label: item.name || t("Not recorded"), count: item.count })))}
    <h2>${label("Completed records")} (${report.records.length})</h2><table><thead><tr>${["Date & Time", "Token", "Patient", "Doctor", "Appointment ID", "Completed at"].map(title => `<th>${label(title)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>
    <footer>${label("Completion times are unavailable for older records.")}<br>${label("Confidential — for authorized hospital staff only.")}</footer></body></html>`;
}
