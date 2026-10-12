// O espelho primário do JWST: 18 segmentos hexagonais em dois anéis,
// com o obturador do espelho secundário ao centro.
const R = 10;
const anel = [];
for (let q = -2; q <= 2; q++) {
  for (let r = -2; r <= 2; r++) {
    const s = -q - r;
    const d = Math.max(Math.abs(q), Math.abs(r), Math.abs(s));
    if (d === 1 || d === 2) anel.push([q, r]);
  }
}
const hex = (cx, cy, raio) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i);
    return `${(cx + raio * Math.cos(a)).toFixed(2)},${(cy + raio * Math.sin(a)).toFixed(2)}`;
  }).join(" ");

export default function Espelho({ tamanho = 52, titulo = "Espelho primário do JWST" }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="-50 -50 100 100" role="img" aria-label={titulo}>
      {anel.map(([q, r], i) => {
        const x = R * 1.5 * q;
        const y = R * Math.sqrt(3) * (r + q / 2);
        const tom = (q + r) % 2 === 0 ? "#e5b84c" : "#d7a93f";
        return <polygon key={i} points={hex(x, y, R - 1.1)} fill={tom} />;
      })}
      <circle cx="0" cy="0" r="3.2" fill="#0f1029" />
    </svg>
  );
}
