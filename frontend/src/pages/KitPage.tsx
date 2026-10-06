import { Button, LinkButton } from '../shared/ui/Button';

export function KitPage() {
  return (
    <div style={{ padding: '48px 32px', display: 'flex', flexDirection: 'column', gap: 48 }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-h1)', fontWeight: 'var(--weight-h1)' }}>
        UI Kit
      </h1>

      {/* Buttons on white */}
      <section>
        <h2 style={{ marginBottom: 24, fontFamily: 'var(--font-display)', fontSize: 'var(--text-h3)', color: 'var(--color-text-muted)' }}>
          Pill buttons — on white
        </h2>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button variant="dark" size="md">Browse the library</Button>
          <Button variant="dark" size="sm">Clear filters</Button>
          <LinkButton to="/partner/library" variant="dark" size="md">Explore this story</LinkButton>
          <LinkButton to="/partner/library" variant="dark" size="sm">See all versions</LinkButton>
        </div>
      </section>

      {/* Buttons on dark */}
      <section style={{ background: 'var(--color-text-primary)', borderRadius: 12, padding: 32 }}>
        <h2 style={{ marginBottom: 24, fontFamily: 'var(--font-display)', fontSize: 'var(--text-h3)', color: 'rgba(255,255,255,0.6)' }}>
          Pill buttons — on dark (hero)
        </h2>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button variant="light" size="md">Browse the library</Button>
          <Button variant="light" size="sm">Explore this story</Button>
          <LinkButton to="/partner" variant="light" size="md">Back to home</LinkButton>
        </div>
      </section>
    </div>
  );
}
