import { pickDocument } from "@/utils/document-picker";

export const pickPaymentSlip = () => pickDocument({
  type: ["image/jpeg", "image/png", "application/pdf"],
  multiple: false,
  copyToCacheDirectory: true,
  base64: false,
});
