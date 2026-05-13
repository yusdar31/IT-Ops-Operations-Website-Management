import { ShieldCheck, ServerCog, Ticket, BellRing } from 'lucide-react';
import { Link } from 'react-router-dom';

const highlights = [
  {
    icon: ServerCog,
    title: 'Asset inventory yang lebih rapi',
    description: 'Pantau server, network device, dan endpoint dalam satu workspace operasional.',
  },
  {
    icon: Ticket,
    title: 'Service desk yang terhubung',
    description: 'Incident, service request, dan update tiket dibangun untuk alur kerja tim IT sehari-hari.',
  },
  {
    icon: BellRing,
    title: 'Notifikasi yang bisa ditindaklanjuti',
    description: 'Event tiket dan assignment bisa diteruskan ke inbox tanpa kehilangan konteks.',
  },
];

export default function AuthShell({ eyebrow, title, description, children, footer }) {
  return (
    <div className="auth-surface">
      <div className="auth-grid">
        <section className="auth-hero">
          <Link to="/" className="auth-brand">
            <span className="auth-brand-mark">
              <ShieldCheck size={18} />
            </span>
            <span>IT Operations Hub</span>
          </Link>

          <div className="space-y-5">
            <p className="auth-eyebrow">{eyebrow}</p>
            <div className="space-y-3">
              <h1 className="auth-title">{title}</h1>
              <p className="auth-copy">{description}</p>
            </div>
          </div>

          <div className="auth-highlights">
            {highlights.map(({ icon: Icon, title: itemTitle, description: itemDescription }) => (
              <div key={itemTitle} className="auth-highlight-card">
                <div className="auth-highlight-icon">
                  <Icon size={18} />
                </div>
                <div>
                  <h2 className="auth-highlight-title">{itemTitle}</h2>
                  <p className="auth-highlight-copy">{itemDescription}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="auth-panel">
          <div className="auth-panel-inner">
            {children}
            {footer ? <div className="auth-footer">{footer}</div> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
