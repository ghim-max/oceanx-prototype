import partnersImg from '../../../Images/entry_page/Partners.jpg';
import teamImg from '../../../Images/entry_page/Team.avif';
import { useRole } from '../shared/context/RoleContext';
import { ImageCard } from '../shared/ui/ImageCard';
import styles from './EntryPage.module.css';

export function EntryPage() {
  const { setRole } = useRole();

  return (
    <div className={styles.page}>
      <div className="page-container">
        <header className={styles.header}>
          <h1 className={styles.heading}>Welcome to OceanX Education</h1>
          <p className={styles.subheading}>Choose how you'd like to continue.</p>
        </header>

        <div className={styles.cards} role="list">
          <div role="listitem">
            <ImageCard
              to="/partner"
              title="I'm a partner"
              description="Browse OceanX content for your learners."
              imagePath={partnersImg}
              onClick={() => setRole('partner')}
            />
          </div>
          <div role="listitem">
            <ImageCard
              to="/team/insights"
              title="OceanX Education team"
              description="Review content performance and recommendations."
              imagePath={teamImg}
              onClick={() => setRole('team')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
