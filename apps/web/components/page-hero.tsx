import Link from "next/link";

export interface HeroNavItem {
  readonly href: string;
  readonly label: string;
  readonly active?: boolean;
}

export function PageHero({
  eyebrow,
  title,
  description,
  nav = [],
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly nav?: readonly HeroNavItem[];
}) {
  return (
    <section className="hero">
      <div className="stack">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {nav.length > 0 ? (
        <nav aria-label={`${title} sections`} className="context-nav">
          {nav.map((item) => (
            <Link data-active={item.active ? "true" : "false"} href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </section>
  );
}
