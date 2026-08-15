export const translations = {
  es: {
    nav: {
      howItWorks: "Cómo funciona",
      reviews: "Reseñas",
      coupons: "Cupones",
      howToUse: "Cómo usar",
      ranking: "Ranking",
      login: "Entrar / Crear cuenta",
      logout: "Cerrar sesión",
    },
    coupons: {
      title: "Cupones — solo para miembros",
      body: "Esta sección es exclusiva para miembros de FundedOrbit. Aquí vamos a ir publicando códigos de descuento para abrir cuentas de fondeo en distintas prop firms, además de links a brokers recomendados. Crea tu cuenta gratis para no perderte los descuentos cuando salgan.",
      cta: "Crear mi cuenta gratis",
    },
    ranking: {
      navLabel: "Ranking",
      title: "Ranking de traders",
      subtitle: "Los mejores ROI de la comunidad FundedOrbit. Datos de ejemplo mientras lanzamos el ranking real.",
      colTrader: "Trader",
      colCountry: "País",
      colRoi: "ROI",
      colWithdrawals: "Retiros",
      blurTitle: "Únete para ver el ranking completo",
      blurSub: "Compite por tu lugar y compara tu ROI con el resto de la comunidad.",
      joinCta: "Únete para competir",
    },
    hero: {
      title1: "Profesionaliza tu trading",
      titleHighlight: "de fondeo",
      subtitle:
        "El centro de mando para traders que buscan fondearse (o ya se fondearon): entiende tus números reales, gestiona el ciclo completo de cada cuenta y toma mejores decisiones. Hasta hoy no existía un panel así de completo — por eso construimos FundedOrbit.",
      ctaStart: "Empezar gratis",
      ctaHow: "Ver cómo funciona",
    },
    featuresTitle: "Todo lo que necesitas en un solo lugar",
    featuresSub: "Construido por y para traders de fondeo.",
    features: [
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
        text: "Súmate al Discord de FundedOrbit y comparte con otros traders de fondeo que buscan profesionalizarse.",
      },
    ],
    reviewsTitle: "Lo que dicen los traders",
    reviewsSub: "Primeros usuarios de FundedOrbit.",
    reviews: [
      {
        name: "Carlos M.",
        role: "Trader fondeado, 6 cuentas activas",
        text: "Antes llevaba todo en Excel y perdía el hilo de cuántos retiros llevaba cada cuenta. Con FundedOrbit sé exactamente cuándo quemar una cuenta antes de que pase a Live.",
        stars: 5,
      },
      {
        name: "Daniela R.",
        role: "Trader en evaluación",
        text: "La parte de ROI real me abrió los ojos — varias cuentas que creía rentables en realidad no lo eran una vez que restas resets y activaciones.",
        stars: 5,
      },
      {
        name: "Iván T.",
        role: "Trader fondeado, cuentas recurrentes",
        text: "Las alertas de cobro mensual me han salvado de pagar membresías de más de una vez. Es justo lo que faltaba en este negocio.",
        stars: 4,
      },
    ],
    ctaCard: {
      title: "Empieza a profesionalizar tu trading de fondeo",
      sub: "Gratis para empezar. Sin tarjeta de crédito.",
      button: "Crear mi cuenta",
    },
    footerNote: "FundedOrbit © {year} — fundedorbit.com",
    login: {
      brand: "FundedOrbit",
      tabLogin: "Entrar",
      tabSignup: "Crear cuenta",
      email: "Correo",
      emailPlaceholder: "tucorreo@ejemplo.com",
      password: "Contraseña",
      passwordPlaceholder: "Mínimo 6 caracteres",
      submitLoading: "Un momento...",
      submitSignup: "Crear cuenta",
      submitLogin: "Entrar",
      or: "o",
      google: "Continuar con Google",
      confirmEmailMsg: "Revisa tu correo para confirmar tu cuenta antes de entrar.",
    },
    onboarding: {
      loading: "Cargando...",
      subtitle: "Últimos datos para tu perfil",
      nickname: "Nickname",
      nicknamePlaceholder: "Como te verán en los rankings",
      avatar: "Avatar",
      country: "País",
      submit: "Terminar y entrar",
      submitLoading: "Guardando...",
      errorNickname: "Elige un nickname.",
    },
    dashboard: {
      loading: "Cargando...",
      welcome: "Bienvenido,",
      placeholder:
        "Tu cuenta está lista. El panel completo de cuentas fondeadas (el mismo que ya usas en tu versión local) se está migrando aquí — muy pronto vas a poder registrar y gestionar tus cuentas de fondeo desde fundedorbit.com.",
    },
    comoUsar: {
      title: "Cómo usar FundedOrbit",
      intro:
        "FundedOrbit es tu centro de mando para el trading de fondeo: desde que compras una evaluación hasta que la cuenta está fondeada, te paga, se quema o te banean. Aquí te explicamos qué puedes hacer con la plataforma y qué significa cada campo que vas a llenar por cuenta.",
      sections: [
        {
          heading: "1. El ciclo de vida de una cuenta",
          body:
            "Cada cuenta que registras pasa por estados: Activa (en evaluación), Pasada / Fondeada (ya la aprobaste), Live (te la subieron a cuenta real de fondos propios de la firma) y Quemada (perdiste la cuenta). Por separado puedes marcar si te banearon o si la cancelaste — esto no borra tu historial, solo agrega el dato.",
        },
        {
          heading: "2. Datos básicos de la cuenta",
          body:
            "ID de cuenta: el identificador que te da la prop firm. Empresa: el nombre de la prop firm (ej. FTMO, MyFundedFX). Tipo de cuenta: el nombre del plan/challenge que compraste. Tamaño de cuenta: el capital que estás evaluando o que te fondearon. Método de pago: cómo pagaste la evaluación (tarjeta, cripto, etc.).",
        },
        {
          heading: "3. Costos: compra, reinicios y activación",
          body:
            "Costo de compra: lo que pagaste por la evaluación. Reinicios: cada vez que reinicias la evaluación puedes agregar la fecha y el costo de ese reinicio — se suman todos al invertido. Costo de activación: algunas firms cobran una cuota cuando pasas de evaluación a fondeada; se registra aparte y también cuenta como invertido.",
        },
        {
          heading: "4. Cobro recurrente (membresías mensuales)",
          body:
            "Si tu evaluación se cobra mes a mes, marca la casilla de 'Cobro recurrente'. Mientras la cuenta siga Activa, cada mes que se cumpla desde tu fecha de compra se suma automáticamente el mismo monto al invertido — no tienes que registrarlo tú. En cuanto la cuenta pasa, se quema o la cancelas, el conteo se detiene solo. Siempre puedes ver cuántos cobros lleva cada cuenta.",
        },
        {
          heading: "5. IDs adicionales (evaluación → fondeada)",
          body:
            "Muchas prop firms te dan un ID nuevo cuando pasas de evaluación a cuenta fondeada. En vez de crear una cuenta separada, puedes agregar ese ID nuevo como 'ID adicional' dentro de la misma cuenta, así conservas todo el historial (costos, retiros, alertas) en un solo lugar.",
        },
        {
          heading: "6. Retiros y su estatus",
          body:
            "Cada retiro que registras tiene un estatus: Solicitado, Aprobado, Recibido o Denegado. Solo los retiros 'Recibidos' cuentan como dinero real en tu ROI — los demás se muestran aparte como pendientes o denegados. Puedes registrar la fecha de solicitud, la fecha de recepción, el monto, subir tu certificado de pago, y si te lo niegan, la razón.",
        },
        {
          heading: "7. Alertas automáticas",
          body:
            "La plataforma te avisa cuando: una cuenta activa lleva más de 45 días sin resolución, una cuenta ya acumuló 3 o más retiros recibidos (para que decidas si la quemas antes de que pase a Live), una cuenta fondeada aún no ha recibido ningún retiro, un pago fue denegado, o se acerca la fecha de un cobro recurrente mensual.",
        },
        {
          heading: "8. Baneos y cancelaciones",
          body:
            "Si una prop firm te banea, márcalo con la fecha y la razón que te dieron — esto alimenta el ranking de empresas por baneos. Cancelar una cuenta es independiente del estado: puedes tener una cuenta 'Quemada' y además marcarla como cancelada, sin perder el registro de que llegó a fondearse.",
        },
        {
          heading: "9. Dashboard y ROI",
          body:
            "El dashboard te muestra el total invertido y retirado, tu ROI real, tasa de aprobación, LTV promedio por cuenta, tiempo promedio para pasar o quemarse, promedio de retiros por cuenta antes de morir, y qué empresas te pagan mejor y más rápido.",
        },
      ],
    },
  },
  en: {
    nav: {
      howItWorks: "How it works",
      reviews: "Reviews",
      coupons: "Coupons",
      howToUse: "How to use",
      ranking: "Ranking",
      login: "Log in / Sign up",
      logout: "Log out",
    },
    coupons: {
      title: "Coupons — members only",
      body: "This section is exclusive to FundedOrbit members. We'll be posting discount codes to open funded-evaluation accounts across different prop firms here, plus links to recommended brokers. Create your free account so you don't miss the discounts when they drop.",
      cta: "Create my free account",
    },
    ranking: {
      navLabel: "Ranking",
      title: "Trader ranking",
      subtitle: "The best ROI in the FundedOrbit community. Sample data while we launch the real ranking.",
      colTrader: "Trader",
      colCountry: "Country",
      colRoi: "ROI",
      colWithdrawals: "Withdrawals",
      blurTitle: "Join to see the full ranking",
      blurSub: "Compete for your spot and compare your ROI with the rest of the community.",
      joinCta: "Join to compete",
    },
    hero: {
      title1: "Professionalize your",
      titleHighlight: "funded trading journey",
      subtitle:
        "The command center for traders working toward funded accounts (or already funded): understand your real numbers, manage the full lifecycle of every account, and make better decisions. Until now, no panel this complete existed — that's why we built FundedOrbit.",
      ctaStart: "Start for free",
      ctaHow: "See how it works",
    },
    featuresTitle: "Everything you need in one place",
    featuresSub: "Built by and for prop-firm traders.",
    features: [
      {
        icon: "📊",
        title: "Your numbers, clear",
        text: "Invested, withdrawn, real ROI and net per account — calculated only from money you've actually received, no fluff.",
      },
      {
        icon: "🛰️",
        title: "The full lifecycle",
        text: "From evaluation to funded, paid, burned, or banned. One panel for every account, across every prop firm.",
      },
      {
        icon: "🔔",
        title: "Smart alerts",
        text: "We warn you when an account has racked up too many withdrawals, when its next monthly charge is coming, and more.",
      },
      {
        icon: "🏆",
        title: "Rankings",
        text: "Compete on ROI and total withdrawals, and see which prop firms pay best and fastest according to the community.",
      },
      {
        icon: "🎟️",
        title: "Coupons and brokers",
        text: "Exclusive discounts to open new accounts and links to recommended brokers, all in one place.",
      },
      {
        icon: "🌐",
        title: "Community",
        text: "Join the FundedOrbit Discord and connect with other funded-trading traders working to level up.",
      },
    ],
    reviewsTitle: "What traders are saying",
    reviewsSub: "Early FundedOrbit users.",
    reviews: [
      {
        name: "Carlos M.",
        role: "Funded trader, 6 active accounts",
        text: "I used to track everything in Excel and lost count of withdrawals per account. With FundedOrbit I know exactly when to burn an account before it goes Live.",
        stars: 5,
      },
      {
        name: "Daniela R.",
        role: "Trader in evaluation",
        text: "The real ROI view was eye-opening — some accounts I thought were profitable actually weren't once you subtract resets and activation fees.",
        stars: 5,
      },
      {
        name: "Iván T.",
        role: "Funded trader, recurring accounts",
        text: "The monthly billing alerts have saved me from double-paying memberships more than once. Exactly what this business was missing.",
        stars: 4,
      },
    ],
    ctaCard: {
      title: "Start professionalizing your funded trading",
      sub: "Free to start. No credit card required.",
      button: "Create my account",
    },
    footerNote: "FundedOrbit © {year} — fundedorbit.com",
    login: {
      brand: "FundedOrbit",
      tabLogin: "Log in",
      tabSignup: "Sign up",
      email: "Email",
      emailPlaceholder: "you@example.com",
      password: "Password",
      passwordPlaceholder: "6 characters minimum",
      submitLoading: "One moment...",
      submitSignup: "Create account",
      submitLogin: "Log in",
      or: "or",
      google: "Continue with Google",
      confirmEmailMsg: "Check your email to confirm your account before logging in.",
    },
    onboarding: {
      loading: "Loading...",
      subtitle: "Last details for your profile",
      nickname: "Nickname",
      nicknamePlaceholder: "How you'll appear on rankings",
      avatar: "Avatar",
      country: "Country",
      submit: "Finish and enter",
      submitLoading: "Saving...",
      errorNickname: "Choose a nickname.",
    },
    dashboard: {
      loading: "Loading...",
      welcome: "Welcome,",
      placeholder:
        "Your account is ready. The full funded-accounts panel (the same one you already use in your local version) is being migrated here — very soon you'll be able to register and manage your funded accounts from fundedorbit.com.",
    },
    comoUsar: {
      title: "How to use FundedOrbit",
      intro:
        "FundedOrbit is your command center for funded trading: from the moment you buy an evaluation to when the account gets funded, pays you, burns, or you get banned. Here's what you can do on the platform and what each field you fill in per account means.",
      sections: [
        {
          heading: "1. An account's lifecycle",
          body:
            "Every account you register moves through statuses: Active (in evaluation), Passed / Funded (you cleared it), Live (the firm moved you to a real funded account) and Burned (you lost the account). Separately, you can flag if you got banned or if you cancelled it — that never erases your history, it just adds the fact.",
        },
        {
          heading: "2. Basic account data",
          body:
            "Account ID: the identifier the prop firm gives you. Company: the prop firm's name (e.g. FTMO, MyFundedFX). Account type: the name of the challenge/plan you bought. Account size: the capital you're evaluating or that got funded. Payment method: how you paid for the evaluation (card, crypto, etc.).",
        },
        {
          heading: "3. Costs: purchase, resets and activation",
          body:
            "Purchase cost: what you paid for the evaluation. Resets: every time you reset the evaluation you can log the date and cost — all of them add up to your invested total. Activation cost: some firms charge a fee when you move from evaluation to funded; it's logged separately and also counts as invested.",
        },
        {
          heading: "4. Recurring billing (monthly memberships)",
          body:
            "If your evaluation is billed monthly, check the 'Recurring billing' box. While the account stays Active, the same amount is automatically added to your invested total every month on your purchase anniversary — you don't have to log it yourself. As soon as the account passes, burns, or you cancel it, the count stops on its own. You can always see how many charges each account has had.",
        },
        {
          heading: "5. Extra IDs (evaluation → funded)",
          body:
            "Many prop firms issue a new ID when you move from evaluation to a funded account. Instead of creating a separate account, you can add that new ID as an 'extra ID' inside the same account, keeping its whole history (costs, withdrawals, alerts) in one place.",
        },
        {
          heading: "6. Withdrawals and their status",
          body:
            "Every withdrawal you log has a status: Requested, Approved, Received, or Denied. Only 'Received' withdrawals count as real money in your ROI — the rest show up separately as pending or denied. You can log the request date, the received date, the amount, upload your payout certificate, and if it's denied, the reason.",
        },
        {
          heading: "7. Automatic alerts",
          body:
            "The platform warns you when: an active account has gone 45+ days without resolution, an account has racked up 3 or more received withdrawals (so you can decide whether to burn it before it goes Live), a funded account still hasn't received any withdrawal, a payout was denied, or a monthly recurring charge is coming up.",
        },
        {
          heading: "8. Bans and cancellations",
          body:
            "If a prop firm bans you, log it with the date and the reason they gave you — this feeds the firm-ban rankings. Cancelling an account is independent from its status: you can have a 'Burned' account and also mark it as cancelled, without losing the record that it once got funded.",
        },
        {
          heading: "9. Dashboard and ROI",
          body:
            "The dashboard shows your total invested and withdrawn, your real ROI, approval rate, average LTV per account, average time to pass or burn, average withdrawals per account before it dies, and which firms pay you best and fastest.",
        },
      ],
    },
  },
};

export function t(lang, path) {
  const dict = translations[lang] || translations.es;
  return path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), dict);
}
