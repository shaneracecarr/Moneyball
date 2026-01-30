"use client";

import { useEffect, useRef } from "react";

export function StyleHealthCheck() {
  const probeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = probeRef.current;
    if (!el) return;

    // Small delay to let CSS chunks finish loading
    const timer = setTimeout(() => {
      const style = window.getComputedStyle(el);
      if (style.display !== "none") {
        console.error(
          "[StyleHealthCheck] Tailwind CSS is NOT applied.\n" +
          "The probe div has display=\"" + style.display + "\" but expected \"none\".\n\n" +
          "Fix: delete the .next cache and restart the dev server:\n" +
          "  1. Stop the dev server\n" +
          "  2. Remove the .next folder (rm -rf .next)\n" +
          "  3. Run npm run dev\n\n" +
          "If this persists, check:\n" +
          "  - app/layout.tsx imports ./globals.css\n" +
          "  - globals.css has @tailwind base/components/utilities\n" +
          "  - Network tab for CSS 404s or empty responses"
        );

        if (process.env.NODE_ENV !== "production") {
          const banner = document.createElement("div");
          banner.setAttribute("data-style-warning", "true");
          banner.textContent = "⚠ Styles not loaded — delete .next and restart dev server";
          Object.assign(banner.style, {
            position: "fixed",
            bottom: "0",
            left: "0",
            right: "0",
            zIndex: "99999",
            background: "#dc2626",
            color: "#fff",
            textAlign: "center",
            padding: "8px 16px",
            fontSize: "14px",
            fontFamily: "system-ui, sans-serif",
          });
          document.body.appendChild(banner);
        }
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // The "hidden" class sets display:none in Tailwind.
  // If Tailwind CSS is loaded, this div is invisible and inert.
  return <div ref={probeRef} className="hidden" aria-hidden="true" data-testid="style-probe" />;
}
