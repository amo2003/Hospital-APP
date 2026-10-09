import type { NurseReport } from "../types";
import { escapeHtml, reportDocument } from "./reportDocument";

export async function exportReport(report: NurseReport, t: (value: string) => string, language: string) {
  // Open inside the user's click; awaiting a network request here would trigger popup blockers.
  const preview = window.open("", "_blank");
  if (!preview) throw new Error(t("Allow pop-ups to save the PDF report."));
  preview.opener = null;
  const toolbar = `<div class="toolbar"><button id="save-report">${escapeHtml(t("Save PDF report"))}</button><p>${escapeHtml(t("Choose Save as PDF in the print window."))}</p></div>`;
  preview.document.write(reportDocument(report, t, language).replace("<body>", `<body>${toolbar}`));
  preview.document.close();
  preview.document.getElementById("save-report")?.addEventListener("click", () => preview.print());
  await preview.document.fonts.ready;
  preview.focus();
  preview.print();
}
