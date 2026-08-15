import "./globals.css";
import { LanguageProvider } from "../components/LanguageProvider";

export const metadata = {
  title: "FundedOrbit — Profesionaliza tu trading de fondeo",
  description:
    "El panel que ayuda a traders de fondeo a entender sus números y tomar mejores decisiones sobre sus cuentas.",
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
