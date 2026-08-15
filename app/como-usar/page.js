import ComoUsarClient from "../../components/ComoUsarClient";

export const metadata = {
  title: "Cómo usar",
  description:
    "Guía completa de FundedOrbit: qué significa cada campo de tu cuenta fondeada, cómo funcionan las alertas automáticas, el cobro recurrente, los retiros y el dashboard.",
  alternates: { canonical: "https://fundedorbit.com/como-usar" },
  openGraph: {
    title: "Cómo usar FundedOrbit",
    description:
      "Guía completa de FundedOrbit: qué significa cada campo de tu cuenta fondeada y cómo sacarle provecho al panel.",
    url: "https://fundedorbit.com/como-usar",
    siteName: "FundedOrbit",
    type: "website",
  },
};

export default function Page() {
  return <ComoUsarClient />;
}
