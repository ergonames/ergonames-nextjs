import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({ subsets: ["latin"], variable: "--font-display", weight: ["400", "500", "600", "700"] });

export const metadata = {
  title: "ErgoNames — your web3 username",
  description: "One name for all your crypto addresses, on the Ergo blockchain.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className="font-sans" style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
