import type { NurseReport } from "../types";
import { reportDocument } from "./reportDocument";

export async function exportReport(report: NurseReport, t: (value: string) => string, language: string) {
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([import("jspdf/dist/jspdf.es.min.js"), import("html2canvas")]);
  // Render locally with browser font shaping for Sinhala/Tamil. Paginate first
  // to avoid giant canvases. No report data leaves the browser.
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;left:-10000px;top:0;width:720px;height:1100px;border:0;pointer-events:none";
  document.body.appendChild(frame);
  try {
    const doc = frame.contentDocument!;
    doc.open(); doc.write(reportDocument(report, t, language)); doc.close();
    const source = Array.from(doc.body.children);
    doc.body.replaceChildren();
    doc.body.style.cssText = "width:688px;background:white;color-scheme:light";
    const pages: HTMLDivElement[] = [];
    const newPage = () => {
      const page = doc.createElement("div");
      page.style.cssText = "width:688px;min-height:1px;display:flow-root;background:white;padding:0 0 8px";
      doc.body.appendChild(page); pages.push(page); return page;
    };
    let page = newPage();
    await doc.fonts.ready;
    const pageHeight = 1000;
    for (const element of source) {
      if (element.tagName !== "TABLE") {
        page.appendChild(element);
        if (page.offsetHeight > pageHeight && page.children.length > 1) {
          page.removeChild(element); page = newPage(); page.appendChild(element);
        }
        continue;
      }
      const tableSource = element as HTMLTableElement;
      const startTable = () => {
        const table = doc.createElement("table");
        if (tableSource.tHead) table.appendChild(tableSource.tHead.cloneNode(true));
        table.appendChild(doc.createElement("tbody")); page.appendChild(table); return table;
      };
      let table = startTable();
      for (const row of Array.from(tableSource.tBodies[0].rows)) {
        table.tBodies[0].appendChild(row);
        if (page.offsetHeight > pageHeight) {
          row.remove();
          if (!table.tBodies[0].rows.length) table.remove();
          page = newPage(); table = startTable(); table.tBodies[0].appendChild(row);
        }
      }
    }
    await doc.fonts.ready;
    const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
    pdf.setProperties({ title: `CarePlus Queue Report ${report.from} - ${report.to}`, author: "CarePlus Hospital" });
    for (let index = 0; index < pages.length; index++) {
      const canvas = await html2canvas(pages[index], { scale: 2, backgroundColor: "#ffffff", logging: false, windowWidth: 720 });
      if (index) pdf.addPage();
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 14, 14, 182, canvas.height / canvas.width * 182);
      pdf.setFontSize(9); pdf.setTextColor(82, 103, 131);
      pdf.text(`${index + 1} / ${pages.length}`, 196, 290, { align: "right" });
      canvas.width = 0; canvas.height = 0;
    }
    const url = URL.createObjectURL(pdf.output("blob"));
    const link = document.createElement("a");
    link.href = url; link.download = `CarePlus-Queue-${report.from}-${report.to}.pdf`;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return true;
  } finally {
    frame.remove();
  }
}
