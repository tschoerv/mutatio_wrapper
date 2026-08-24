import { FOOTER_LINKS } from "../constants";

export function SiteFooter({ current }: { current: keyof typeof FOOTER_LINKS }) {
  return (
    <footer className="site-footer">
      <div className="footer-links">
        {FOOTER_LINKS[current].map(([label, href]) => <a key={label} href={href} target="_blank" rel="noreferrer">{label}</a>)}
      </div>
    </footer>
  );
}
