import RankingClient from "../../components/RankingClient";

export const metadata = {
  title: "Ranking de traders y empresas de fondeo",
  description:
    "Compite en ROI y retiros con la comunidad de FundedOrbit, y descubre qué prop firms pagan más rápido.",
  alternates: { canonical: "https://fundedorbit.com/ranking" },
  openGraph: {
    title: "Ranking de traders y empresas de fondeo | FundedOrbit",
    description: "Compite en ROI y retiros con la comunidad de FundedOrbit.",
    url: "https://fundedorbit.com/ranking",
    siteName: "FundedOrbit",
    type: "website",
  },
};

export default function Page() {
  return <RankingClient />;
}
