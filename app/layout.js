import './globals.css';

export const metadata = {
  title: 'AGRO KING',
  description: 'Système de commande et suivi pour l\'élevage de volailles.',
  manifest: '/manifest.json',
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
      <body>
        <main className="container animate-slide-down">
          {children}
        </main>
      </body>
    </html>
  );
}
