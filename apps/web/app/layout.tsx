import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PromoFlow — Central de operações",
  description: "Painel privado de automação de promoções",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
