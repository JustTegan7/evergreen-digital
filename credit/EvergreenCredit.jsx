/**
 * Evergreen Digital footer credit, React / Next.js version.
 * Same markup as credit/evergreen-credit.html. Inherits the footer's text color.
 *
 *   <EvergreenCredit client="barclays-salon" />
 */
export default function EvergreenCredit({ client = "client-site", className = "" }) {
  const href =
    "https://www.evergreendigitalco.com/?utm_source=" +
    encodeURIComponent(client) +
    "&utm_medium=footer_credit&utm_campaign=client_sites";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      aria-label="Website by Evergreen Digital"
      className={`evergreen-credit ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 12,
        lineHeight: 1,
        color: "inherit",
        opacity: 0.65,
        textDecoration: "none",
        transition: "opacity .2s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.65)}
    >
      <span>Site by</span>
      <svg width="10" height="12" viewBox="0 0 20 24" aria-hidden="true" focusable="false" style={{ display: "block", flex: "none" }}>
        <path fill="currentColor" d="M10 0 16 8.5h-3L19 18H1l6-9.5H4z" />
        <rect fill="currentColor" x="8.5" y="18" width="3" height="6" rx="1" />
      </svg>
      <span style={{ fontWeight: 600 }}>Evergreen Digital</span>
    </a>
  );
}
