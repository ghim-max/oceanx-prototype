import { useEffect } from 'react';
import heroJpg from '../../assets/hero.jpg';
import heroWebp from '../../assets/hero.webp';
import journeyBg from '../../assets/journey-bg.jpeg';
import seagrassJpeg from '../../assets/seagrass-stories.jpeg';
import schoolAvif from '../../assets/school.avif';
import universityJpg from '../../assets/university.jpg';
import universityWebp from '../../assets/university.webp';
import museumWebp from '../../assets/museum.webp';
import { ImageCard } from '../../shared/ui/ImageCard';
import { LinkButton } from '../../shared/ui/Button';
import styles from './HomePage.module.css';

const HERO_HEADLINE = 'Ocean stories for every learner';
const HERO_SUBLINE =
  'Footage, activities and stories from real OceanX expeditions, ready for classrooms, campuses and museums.';

const AUDIENCE_CARDS = [
  {
    to: '/partner/library?audience=schools',
    title: 'Schools',
    description: 'Hands-on sessions built around curiosity, discussion and group activities.',
    imagePath: schoolAvif,
    imageAlt: 'A classroom of school students in uniforms seated at individual desks, facing a teacher at a projector screen at the front',
  },
  {
    to: '/partner/library?audience=university',
    title: 'University',
    description: 'Deeper questions, evidence and further reading for older learners.',
    imagePath: universityJpg,
    imageSrcWebp: universityWebp,
    imageAlt: 'Hundreds of students seated in tiered curved rows of a large university lecture hall, with a professor at the chalkboard',
  },
  {
    to: '/partner/library?audience=museum',
    title: 'Museum',
    description: 'Short, visual experiences that work for visitors on the move.',
    imagePath: museumWebp,
    imageAlt: 'A darkened ocean exhibition room bathed in deep blue light, featuring a large projection of a sea turtle swimming over coral reef, with display cases along the walls',
  },
];

const FEATURED_STORY = {
  imageSrc: seagrassJpeg,
  imageAlt: 'A manatee hovers above a lush seagrass meadow in clear, sunlit water',
};

const JOURNEY_STEPS = [
  { n: '1', heading: 'Explore', body: 'Start with curiosity: watch, notice and wonder.' },
  { n: '2', heading: 'Investigate', body: 'Dig into how the ocean works, through play and evidence.' },
  { n: '3', heading: 'Reflect', body: 'Pause to think about what was learned.' },
  { n: '4', heading: 'Create', body: 'Put ideas into action by making something new.' },
];

export function HomePage() {
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<Element>('[data-reveal]'));
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: '0px 0px -40px 0px' }
    );
    // Observe first so in-viewport sections get is-visible before the hiding class lands
    sections.forEach((el) => obs.observe(el));
    // rAF fires after the first observer callbacks — only hide sections still off-screen
    const raf = requestAnimationFrame(() => {
      sections.forEach((el) => {
        if (!el.classList.contains('is-visible')) {
          el.classList.add('reveal-section');
        }
      });
    });
    return () => {
      obs.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className={styles.page}>

      {/* ── 1. Hero ─────────────────────────────────────────── */}
      <section data-hero className={styles.hero} aria-labelledby="hero-heading">
        {/* Image fills full 160svh wrapper and scrolls naturally behind the sticky text */}
        <div className={styles.heroMedia} aria-hidden="true">
          <picture>
            <source srcSet={heroWebp} type="image/webp" />
            <img src={heroJpg} alt="" className={styles.heroImg} />
          </picture>
        </div>
        {/* Sticky frame: pins for ~60svh, then releases and scrolls away with the wrapper */}
        <div className={styles.heroSticky}>
          {/* Overlay lives here so the gradient always covers the current viewport */}
          <div className={styles.heroOverlay} aria-hidden="true" />
          <div className={styles.heroContent}>
            <h1 className={styles.heroHeadline} id="hero-heading">{HERO_HEADLINE}</h1>
            <p className={styles.heroSubline}>{HERO_SUBLINE}</p>
          </div>
        </div>
      </section>

      {/* ── 2. Why seagrass matters ─────────────────────────── */}
      <section data-reveal className={styles.seagrassSection} aria-labelledby="seagrass-heading">
        <div className={styles.wideInner}>
          <div className={styles.seagrassGrid}>
            <div className={styles.seagrassText}>
              <h2 className={styles.sectionHeading} id="seagrass-heading">
                Why seagrass matters
              </h2>
              <p className={styles.bodyText}>
                Seagrasses are flowering plants that form underwater meadows in shallow coastal
                waters all around the world. Unlike seaweed, they have roots, leaves and flowers,
                and they create some of the most productive ecosystems on the planet.
              </p>
              <p className={styles.bodyText}>
                These meadows store vast amounts of carbon in the sediment below them, shelter
                juvenile fish and invertebrates, and help stabilise coastlines against storms and
                erosion. Losing a seagrass meadow means losing all of this at once.
              </p>
              <p className={styles.bodyText}>
                Seagrass Stories follows a team working to understand what it takes to bring a
                damaged meadow back to life: the conditions it needs, the creatures that return,
                and the long, patient work of restoration.
              </p>
            </div>
            <div className={styles.seagrassVideo}>
              <div className={styles.videoWrapper}>
                <iframe
                  src="https://www.youtube-nocookie.com/embed/0bvOh7qby-c?start=41"
                  title="Seagrasses: Ecology In Action (video)"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                  className={styles.videoIframe}
                />
              </div>
              <p className={styles.videoCredit}>Video: Ecology In Action, via YouTube</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Featured story ───────────────────────────────── */}
      <section data-reveal className={styles.featuredSection} aria-labelledby="featured-heading">
        <div className={styles.wideInner}>
          <div className={styles.featuredGrid}>
            <div className={styles.featuredImageWrap}>
              <img
                src={FEATURED_STORY.imageSrc}
                alt={FEATURED_STORY.imageAlt}
                className={styles.featuredImage}
              />
            </div>
            <div className={styles.featuredBody}>
              <p className={styles.featuredLabel}>Featured story</p>
              <h2 className={styles.featuredTitle} id="featured-heading">Seagrass Stories</h2>
              <p className={styles.featuredQuestion}>
                What does it take to bring an underwater meadow back to life?
              </p>
              <div className={styles.quickFacts} aria-label="Quick facts">
                <span className={styles.quickFact}>Ages 12 to 14<span className="visually-hidden">,</span></span>
                <span className={styles.quickFactDot} aria-hidden="true" />
                <span className={styles.quickFact}>60 to 75 minutes<span className="visually-hidden">,</span></span>
                <span className={styles.quickFactDot} aria-hidden="true" />
                <span className={styles.quickFact}>Groups of 2 to 3<span className="visually-hidden">,</span></span>
                <span className={styles.quickFactDot} aria-hidden="true" />
                <span className={styles.quickFact}>13 components</span>
              </div>
              <LinkButton to="/partner/library?story=seagrass-stories" variant="dark">
                Explore this story
              </LinkButton>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. Browse by audience ───────────────────────────── */}
      <section data-reveal className={styles.audienceSection} aria-labelledby="audience-heading">
        <div className={styles.wideInner}>
          <h2 className={styles.sectionHeading} id="audience-heading">Browse by audience</h2>
          <div className={styles.audienceGrid}>
            {AUDIENCE_CARDS.map(({ to, title, description, imagePath, imageSrcWebp, imageAlt }) => (
              <ImageCard
                key={title}
                to={to}
                title={title}
                description={description}
                imagePath={imagePath}
                imageSrcWebp={imageSrcWebp}
                imageAlt={imageAlt}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. Learning journey ─────────────────────────────── */}
      <section
        data-reveal
        data-journey
        className={styles.journeySection}
        aria-labelledby="journey-heading"
        style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.60) 0%, rgba(0,0,0,0.72) 100%), url(${journeyBg})` }}
      >
        <div className={styles.wideInner}>
          <h2 className={styles.sectionHeading} id="journey-heading">How each story unfolds</h2>
          <ol className={styles.journeyStrip} aria-labelledby="journey-heading">
            {JOURNEY_STEPS.map(({ n, heading, body }) => (
              <li key={n} className={styles.journeyStep}>
                <span className={styles.journeyNumber} aria-hidden="true">{n}</span>
                <h3 className={styles.journeyStepHeading}>{heading}</h3>
                <p className={styles.journeyStepBody}>{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

    </div>
  );
}
