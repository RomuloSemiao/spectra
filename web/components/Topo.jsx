"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Espelho from "./Espelho";

export default function Topo() {
  const caminho = usePathname();
  const atual = (h) => (caminho === h ? "page" : undefined);
  return (
    <header className="topo">
      <Link href="/" className="marca">
        <Espelho />
        <h1>
          Spectra - Espectros de trânsito
          <small>Sistema especialista para atmosferas de exoplanetas</small>
        </h1>
      </Link>
      <nav aria-label="Secções">
        <Link href="/" aria-current={atual("/")}>Analisar</Link>
        <Link href="/base" aria-current={atual("/base")}>Base de conhecimento</Link>
        <Link href="/metodo" aria-current={atual("/metodo")}>Método</Link>
      </nav>
    </header>
  );
}
