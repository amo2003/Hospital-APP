import { getDocumentAsync } from "expo-document-picker";

// Keep the browser call synchronous with the button press (user activation).
export const pickDocument = getDocumentAsync;
