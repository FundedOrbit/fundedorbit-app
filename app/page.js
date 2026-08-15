import Link from "next/link";

const features = [
  {
    icon: "📊",
    title: "Tus números, claros",
    text: "Invertido, retirado, ROI real y neto por cuenta — calculado solo con pagos efectivamente recibidos, sin adornos.",
  },
  {
    icon: "🛰️",
    title: "Todo el ciclo de vida",
    text: "Desde evaluación hasta fondeada, pagada, quemada o baneada. Un panel, todas tus cuentas de todas las prop firms.",
  },
  {
    icon: "🔔",
    title: "Alertas inteligentes",
    text: "Te avisamos cuando una cuenta lleva muchos retiros, cuándo se acerca su próximo cobro mensual, y más.",
  },
  {
    icon: "🏆",
    title: "Rankings",
    text: "Compite en ROI, retiros totales y descubre qué prop firms pagan mejor y más rápido, según la comunidad.",
  },
  {
    icon: "🎟️",
    title: "Cupones y brokers",
    text: "Descuentos exclusivos para abrir cuentas nuevas y links a brokers recomendados, todo en un solo lugar.",
  },
  {
    icon: "🌐",
    title: "Comunidad",
    text: "Súmate al Discord de FundedOrbit y comparte con otros traders fondeados que buscan profesionalizarse.",
  },
];

const reviews = [
  {
    name: "Carlos M.",
    role: "Trader fondeado, 6 cuentas activas",
    text: "Antes llevaba todo en Excel y perdía el hilo de cuántos retiros llevaba cada cuenta. Con FundedOrbit sé exactamente cuándo quemar una cuenta antes de que pase a Live.",
    stars: 5,
  },
  {
    name: "Daniela R.",
    role: "Trader fondeada",
    text: "La parte de ROI real me abrió los ojos — varias cuentas que creía rentables en realidad no lo eran una vez que restas resets y activaciones.",
    stars: 5,
  },
  {
    name: "Iván T.",
    role: "Trader fondeado, cuentas recurrentes",
    text: "Las alertas de cobro mensual me han salvado de pagar membresías de más de una vez. Es justo lo que faltaba en este negocio.",
    stars: 4,
  },
];

export default function LandingPage() {
  return (
    <div className="wrap">
      <nav className="nav">
        <div className="brand">
          <span className="dot" />
          FundedOrbit
        </div>
        <div className="nav-links">
          <span>Cómo funciona</span>
          <span>Reseñas</span>
          <span>Cupones</span>
        </div>
        <Link href="/login" className="btn btn-primary">
          Entrar / Crear cuenta
        </Link>
      </nav>

      <section className="hero">
        <h1>
          Profesionaliza tu trading <span>fondeado</span>
        </h1>
        <p>
          El centro de mando para traders con cuentas fondeadas: entiende tus números reales,
          gestiona el ciclo completo de cada cuenta y toma mejores decisiones. Hasta hoy no
          existía un panel así de completo — por eso construimos FundedOrbit.
        </p>
        <div className="hero-actions">
          <Link href="/login" className="btn btn-primary">
            Empezar gratis
          </Link>
          <a href="#como-funciona" className="btn btn-ghost">
            Ver cómo funciona
          </a>
        </div>
      </section>

      <section className="section" id="como-funciona">
        <h2>Todo lo que necesitas en un solo lugar</h2>
        <p className="sub">Construido por y para traders fondeados.</p>
        <div className="grid-3">
          {features.map((f) => (
            <div className="card" key={f.title}>
              <div className="icon-badge">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="resenas">
        <h2>Lo que dicen los traders</h2>
        <p className="sub">Primeros usuarios de FundedOrbit.</p>
        <div className="grid-3">
          {reviews.map((r) => (
            <div className="review-card" key={r.name}>
              <div className="stars-row">{"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}</div>
              <p>&ldquo;{r.text}&rdquo;</p>
              <div className="review-author">{r.name}</div>
              <div className="review-role">{r.role}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="cta-card">
          <h2>Empieza a profesionalizar tus cuentas fondeadas</h2>
          <p>Gratis para empezar. Sin tarjeta de crédito.</p>
          <Link href="/login" className="btn btn-primary">
            Crear mi cuenta
          </Link>
        </div>
      </section>

      <div className="footer-note">FundedOrbit © {new Date().getFullYear()} — fundedorbit.com</div>
    </div>
  );
}
