# FundedOrbit

Plataforma para profesionalizar a traders con cuentas fondeadas: entender sus números reales
y tomar mejores decisiones sobre el ciclo de vida de cada cuenta (evaluación, fondeada, pagos,
quemada, baneada).

## Stack
- Next.js 14 (App Router)
- Supabase (Auth + Postgres + Storage)
- Vercel (hosting)

## Desarrollo local
1. `npm install`
2. Copia `.env.example` a `.env.local` y llena tus valores de Supabase.
3. `npm run dev`

## Base de datos
Las migraciones viven en `supabase/migrations/`. Al hacer merge a `main`, la integración de
GitHub de Supabase las aplica automáticamente al proyecto de producción.
