// Régua de significância: de −3σ a +7σ, com as zonas das regras.
// O marcador é um segmento hexagonal dourado.
const MIN = -3, MAX = 7;

export default function ReguaSigma({ sigma, forte = 5, fraca = 3, indicio = 2, altura = 14 }) {
  const W = 200;
  const x = (v) => ((Math.max(MIN, Math.min(MAX, v)) - MIN) / (MAX - MIN)) * W;
  const fora = sigma !== null && sigma !== undefined && (sigma > MAX || sigma < MIN);
  return (
    <svg viewBox={`0 0 ${W} ${altura}`} width="100%" height={altura} preserveAspectRatio="none"
      role="img" aria-label={sigma === null || sigma === undefined ? "Sem medida" : `${sigma.toFixed(1)} sigma`}>
      <rect x="0" y={altura / 2 - 3} width={W} height="6" rx="1" fill="rgba(167,170,203,0.14)" />
      <rect x={x(indicio)} y={altura / 2 - 3} width={x(fraca) - x(indicio)} height="6" fill="rgba(226,166,211,0.3)" />
      <rect x={x(fraca)} y={altura / 2 - 3} width={x(forte) - x(fraca)} height="6" fill="rgba(242,166,90,0.35)" />
      <rect x={x(forte)} y={altura / 2 - 3} width={W - x(forte)} height="6" rx="1" fill="rgba(124,221,166,0.38)" />
      <line x1={x(0)} x2={x(0)} y1="1" y2={altura - 1} stroke="rgba(236,234,246,0.35)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      {sigma !== null && sigma !== undefined && (
        <rect x={x(sigma) - 2.5} y="0" width="5" height={altura} rx="1" fill={fora ? "#f1d083" : "#e5b84c"} />
      )}
    </svg>
  );
}
