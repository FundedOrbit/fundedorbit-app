import CuponesClient from "../../components/CuponesClient";

export const metadata = {
  title: "Cupones y beneficios",
  description:
    "Condiciones preferentes con empresas aliadas para traders de fondeo: brókers recomendados y beneficios exclusivos de la comunidad FundedOrbit.",
  alternates: { canonical: "https://fundedorbit.com/cupones" },
  openGraph: {
    title: "Cupones y beneficios | FundedOrbit",
    description: "Condiciones preferentes con empresas aliadas para traders de fondeo.",
    url: "https://fundedorbit.com/cupones",
    siteName: "FundedOrbit",
    type: "website",
  },
};

export default function Page() {
  return <CuponesClient />;
}
