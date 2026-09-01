// Catálogo de países compartido (onboarding + ranking), para poder mostrar
// la bandera aunque en la base de datos solo se guarde el nombre del país.
export const COUNTRIES = [
  { code: "MX", name: "México", flag: "🇲🇽" },
  { code: "US", name: "Estados Unidos", flag: "🇺🇸" },
  { code: "CO", name: "Colombia", flag: "🇨🇴" },
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "CL", name: "Chile", flag: "🇨🇱" },
  { code: "PE", name: "Perú", flag: "🇵🇪" },
  { code: "ES", name: "España", flag: "🇪🇸" },
  { code: "EC", name: "Ecuador", flag: "🇪🇨" },
  { code: "VE", name: "Venezuela", flag: "🇻🇪" },
  { code: "GT", name: "Guatemala", flag: "🇬🇹" },
  { code: "BR", name: "Brasil", flag: "🇧🇷" },
  { code: "OTHER", name: "Otro país", flag: "🌐" },
];

const NAME_TO_FLAG = COUNTRIES.reduce((map, c) => {
  map[c.name] = c.flag;
  return map;
}, {});

export function countryNameToFlag(name) {
  if (!name) return "🌎";
  return NAME_TO_FLAG[name] || "🌎";
}
