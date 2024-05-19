import { Inter } from 'next/font/google'
import Navigation from '@/src/app/components/Navigation/navigation';
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

// if (!window) {
//     require('localstorage-polyfill');
// };

export const metadata = {
  title: 'ErgoNames',
  description: 'Decentralised identity solution on Ergo blockchain',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', }}>
        <Navigation/>
        <div style={{ flex: 1, padding: '20px', backgroundColor: '#f3f3f3', display: 'flex', flexDirection: 'column', alignItems: 'center' ,}}>
          {children}
        </div>
      </body>
      
    </html>
  )
}
