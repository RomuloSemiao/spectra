import "./globals.css";
import Topo from "@/components/Topo";

export const metadata = {
  title: "Espectros de trânsito, sistema especialista",
  description: "Identificação de planeta e espécies químicas a partir de espectros de trânsito",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;600&family=Instrument+Serif&display=swap"
        />
      </head>
      <body>
        <Topo />
        {children}
      </body>
    </html>
  );
}
