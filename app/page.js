import LandingClient from "../components/LandingClient";

export const metadata = {
  title: { absolute: "FundedOrbit — Profesionaliza tu trading de fondeo" },
  description:
    "El centro de mando para traders de fondeo: entiende tus números reales, gestiona el ciclo completo de cada cuenta fondeada y toma mejores decisiones. Gratis para empezar, sin tarjeta de crédito.",
  alternates: { canonical: "https://fundedorbit.com" },
  openGraph: {
    title: { absolute: "FundedOrbit — Profesionaliza tu trading de fondeo" },
    description:
      "El centro de mando para traders de fondeo: entiende tus números reales y gestiona el ciclo completo de cada cuenta fondeada.",
    url: "https://fundedorbit.com",
    siteName: "FundedOrbit",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: { absolute: "FundedOrbit — Profesionaliza tu trading de fondeo" },
    description:
      "El centro de mando para traders de fondeo: entiende tus números reales y gestiona el ciclo completo de cada cuenta fondeada.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "FundedOrbit",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  url: "https://fundedorbit.com",
  description:
    "Centro de mando para traders de fondeo: gestiona el ciclo completo de tus cuentas fondeadas, entiende tu ROI real y recibe alertas automáticas.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingClient />
    </>
  );
}
