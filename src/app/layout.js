import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "ErgoNames",
  description: "Decentralised identity solution on Ergo blockchain",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className} style={{ margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
