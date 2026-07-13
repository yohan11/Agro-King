import './globals.css';

export const metadata = {
  title: 'AGRO KING',
  description: 'Système de commande et suivi pour l\'élevage de volailles.',
  icons: {
    icon: '/logo.jpeg',
    shortcut: '/logo.jpeg',
    apple: '/logo.jpeg',
  },
};

export const viewport = {
  themeColor: '#2E7D32',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
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
        <main className="container animate-slide-down">
          {children}
        </main>
      </body>
    </html>
  );
}
