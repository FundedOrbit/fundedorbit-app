export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/accounts", "/login", "/onboarding", "/reset-password"],
      },
    ],
    sitemap: "https://fundedorbit.com/sitemap.xml",
  };
}
