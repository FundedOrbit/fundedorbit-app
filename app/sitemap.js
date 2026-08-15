export default function sitemap() {
  const base = "https://fundedorbit.com";
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/como-usar`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/ranking`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
  ];
}
