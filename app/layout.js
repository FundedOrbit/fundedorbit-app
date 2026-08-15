import "./globals.css";

export const metadata = {
  title: "FundedOrbit — Profesionaliza tu trading fondeado",
  description:
    "El panel que ayuda a traders fondeados a entender sus números y tomar mejores decisiones sobre sus cuentas.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <div className="stars" />
        {children}
      </body>
    </html>
  );
}
