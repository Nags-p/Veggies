// This page is replaced by /orders/track/page.tsx to support Next.js Static HTML Export (output: 'export').
// It is kept as a dummy static page to prevent build errors before the folder is manually deleted.

export function generateStaticParams() {
  return [{ id: "dummy" }];
}

export default function DummyTrackPage() {
  return null;
}
