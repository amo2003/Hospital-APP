// Explicit browser entry avoids the Node/AMD bundle during Expo static export.
declare module "jspdf/dist/jspdf.es.min.js" {
  export { jsPDF } from "jspdf";
}
