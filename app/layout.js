import './globals.css';
import GlobalClickLoader from './GlobalClickLoader';

export const metadata = {
  title: 'AGRO KING | App Éleveur',
  description: 'Application mobile de commande et de suivi pour l\'élevage de volailles AgroKing.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/logo.jpeg',
    shortcut: '/logo.jpeg',
    apple: '/logo.jpeg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AgroKing',
  },
};

export const viewport = {
  themeColor: '#1B5E20',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('ServiceWorker registration successful');
                    },
                    function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </head>
      <body>
        <GlobalClickLoader />
        <div className="app-shell">
          <main className="container animate-slide-down">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
