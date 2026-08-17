import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { LanguageProvider } from "../components/LanguageProvider";

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata = {
  metadataBase: new URL("https://fundedorbit.com"),
  title: {
    default: "FundedOrbit — Profesionaliza tu trading de fondeo",
    template: "%s | FundedOrbit",
  },
  description:
    "El panel que ayuda a traders de fondeo a entender sus números y tomar mejores decisiones sobre sus cuentas.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <div className="stars" />
        <LanguageProvider>{children}</LanguageProvider>
        <Analytics />
      </body>
    </html>
  );
}
