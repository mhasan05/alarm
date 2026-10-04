"use client";

import { useEffect } from "react";

/** Last-resort fallback when the root layout itself fails. It replaces <html>, so it is self-contained. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="bn">
      <body style={{ margin: 0, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4f9f7", fontFamily: "system-ui, sans-serif", color: "#0d1f17", padding: 16 }}>
        <div style={{ maxWidth: 420, width: "100%", background: "#fff", border: "1px solid #c8ddd6", borderRadius: 14, padding: 28, textAlign: "center" }}>
          <h1 style={{ fontSize: 18, margin: "0 0 8px" }}>সাইটটি খোলা যায়নি</h1>
          <p style={{ fontSize: 13.5, lineHeight: 1.7, color: "#4a7060", margin: "0 0 20px" }}>হঠাৎ একটি সমস্যা হয়েছে। আপনার কোনো তথ্য হারায়নি — আবার চেষ্টা করুন।</p>
          {error.digest && <p style={{ fontSize: 11, color: "#4a7060", margin: "0 0 16px" }}>Reference: {error.digest}</p>}
          <button onClick={reset} style={{ height: 42, padding: "0 20px", border: 0, borderRadius: 10, background: "#006a4e", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            আবার চেষ্টা করুন
          </button>
        </div>
      </body>
    </html>
  );
}
