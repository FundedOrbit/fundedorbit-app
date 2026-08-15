import "./globals.css";
import { LanguageProvider } from "../components/LanguageProvider";

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
      </body>
    </html>
  );
}
