import Script from "next/script";
import ThemeSwitch from "@/components/ThemeSwitch";
import "./globals.css";

const themeBoot = `
try {
  var saved = localStorage.getItem("nord-theme");
  var theme = saved === "light" || saved === "dark"
    ? saved
    : (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);
} catch (e) {}
`;

export const metadata = {
  title: "НордСервис — запись",
  description: "Запись на диагностику, ремонт, замену масла и мойку.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <Script id="nord-theme" strategy="beforeInteractive">
          {themeBoot}
        </Script>
        <header className="top">
          <a className="logo" href="/">НордСервис</a>
          <div className="top-actions">
            <ThemeSwitch />
            <nav>
              <a href="/">Запись</a>
              <a href="/admin">Журнал</a>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
