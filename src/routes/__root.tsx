import { useEffect } from "react";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale 1, viewport-fit=cover".replace(
          "initial-scale 1",
          "initial-scale=1",
        ),
      },
      {
        title: "LPIN Suite — Claims & Jobsite",
      },
      {
        name: "description",
        content:
          "LPIN Suite: Claims scores public claims without fake certainty. Jobsite runs a US field board with building-department messages, inspections, schedules, and materials. Open packs. Device-local.",
      },
      { name: "theme-color", content: "#060e16" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&display=swap",
      },
      { rel: "icon", href: "/lpin/mark-lpin-sq.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/lpin/brand-icon-256.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  component: RootDocument,
});

function RootDocument() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const register = () => {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        /* optional offline shell */
      });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="antialiased">
        <Outlet />
        <Toaster
          position="bottom-center"
          theme="dark"
          closeButton
          toastOptions={{
            className: "font-sans",
          }}
        />
        <Scripts />
      </body>
    </html>
  );
}
