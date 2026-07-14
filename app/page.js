'use client';
import { useRouter } from 'next/navigation';
import { FiBox, FiTrendingUp, FiSmartphone, FiArrowRight } from 'react-icons/fi';

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="landing-container">
      {/* Header */}
      <header className="landing-header">
        <div className="landing-logo">
          <img src="/logo.jpeg" alt="Agro-King Logo" />
          <span>AGRO KING</span>
        </div>
        <button onClick={() => router.push('/login')} className="btn btn-primary cta-button">
          Commander
        </button>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title animate-slide-up">
            L'Élevage de Volailles,<br/>
            <span className="text-highlight">Réinventé & Simplifié.</span>
          </h1>
          <p className="hero-subtitle animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Recevez vos poussins de qualité, vos aliments adaptés à chaque stade (démarrage, croissance, finition) et suivez vos cycles directement depuis votre téléphone.
          </p>
          <div className="hero-actions animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <button onClick={() => router.push('/login')} className="btn btn-primary btn-large">
              Passer une Commande <FiArrowRight className="icon-right" />
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2 className="section-title">Ce que nous vous offrons</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon"><FiBox /></div>
            <h3>Packs "Clé en main"</h3>
            <p>Commandez vos poussins par lots (100, 200...) ou sur-mesure. Nous vous livrons avec l'aliment de démarrage nécessaire.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><FiTrendingUp /></div>
            <h3>Alimentation Suivie</h3>
            <p>Nous gérons le cycle de votre élevage. Recevez des alertes au bon moment pour commander vos sacs de croissance et de finition.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><FiSmartphone /></div>
            <h3>Tableau de bord intelligent</h3>
            <p>Suivez vos élevages en temps réel, déclarez des événements, et accédez à vos statistiques depuis notre application web.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-logo">
            <img src="/logo.jpeg" alt="Agro-King Logo" />
            <span>AGRO KING</span>
          </div>
          <p className="footer-text">© {new Date().getFullYear()} Agro-King. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
