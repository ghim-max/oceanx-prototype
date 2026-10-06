import { Link } from 'react-router-dom';
import styles from './HomePage.module.css';

const cardLinks = [
  {
    to: '/library',
    title: 'Content Library',
    description: 'Browse components and versions. Filter by type, audience and topic.',
    action: 'Browse library',
  },
  {
    to: '/learn/v-schools',
    title: 'Learner View',
    description: 'See the content as a learner does and submit a feedback response.',
    action: 'Try a version',
  },
  {
    to: '/insights',
    title: 'Insights',
    description: 'Review completion rates, quiz gains and AI-generated recommendations.',
    action: 'See insights',
  },
];

export function HomePage() {
  return (
    <div className={styles.page}>
      <div className="page-container">
        <section className={styles.hero} aria-labelledby="hero-heading">
          <div className={styles.heroInner}>
            <h1 className={styles.displayLine} id="hero-heading">
              Capture. Learn. Decide.
            </h1>
            <p className={styles.missionLine}>
              OceanX Insights turns learner feedback into clear content decisions,
              so every version of Seagrass Stories reaches learners at its best.
            </p>
          </div>
        </section>

        <section className={styles.cardsSection} aria-labelledby="pathways-label">
          <p className={styles.sectionLabel} id="pathways-label">
            Pathways
          </p>
          <nav aria-label="Main pathways">
            <ul className={styles.cardGrid} role="list">
              {cardLinks.map(({ to, title, description, action }) => (
                <li key={to} role="listitem">
                  <Link to={to} className={styles.card} aria-label={title}>
                    <h2 className={styles.cardTitle}>{title}</h2>
                    <p className={styles.cardDescription}>{description}</p>
                    <span className={styles.cardAction} aria-hidden="true">
                      {action} &rarr;
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </section>
      </div>
    </div>
  );
}

