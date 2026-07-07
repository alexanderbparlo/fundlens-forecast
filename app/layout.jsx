import { DM_Mono, DM_Sans, Syne } from 'next/font/google'
import './globals.css'

const fontDisplay = Syne({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700', '800'],
})

const fontBody = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['300', '400', '500', '600'],
})

const fontMono = DM_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['300', '400', '500'],
})

export const metadata = {
  title: 'FundLens Forecast — GP Scenario Analysis',
  description:
    'Scenario analysis and return projection tool for alternative investment fund managers. PE, VC, Hedge Fund, and Real Assets.',
}

// Inline script prevents flash of wrong theme before hydration.
const themeScript = `
  try {
    var t = localStorage.getItem('forecast-theme') || 'dark';
    document.documentElement.className = t;
  } catch(e) {
    document.documentElement.className = 'dark';
  }
`

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`
          ${fontDisplay.variable}
          ${fontBody.variable}
          ${fontMono.variable}
          font-body
          text-text-primary
          antialiased
          min-h-screen
        `}
      >
        {children}
      </body>
    </html>
  )
}
