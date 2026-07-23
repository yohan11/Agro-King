export default function GlobalLoader({ text = "Veuillez patienter..." }) {
  return (
    <div className="global-loader-overlay">
      <div className="large-spinner"></div>
      <div className="loading-text">{text}</div>
    </div>
  );
}
