import seagrassGameThumb from '../../assets/seagrass_game.webp';
import seagrassWonderThumb from '../../assets/seagrass_wonder.webp';
import seagrassPromptThumb from '../../assets/seagrass_prompt.webp';
import seagrassRestoreThumb from '../../assets/seagrass_restore.webp';
import seagrassMapThumb from '../../assets/seagrass_map.webp';
import seagrassIntentionThumb from '../../assets/seagrass_intention.webp';
import seagrassGuideThumb from '../../assets/seagrass_guide.webp';
import seagrassQuestionThumb from '../../assets/seagrass_question.webp';
import seagrassOrganiserThumb from '../../assets/seagrass_organiser.webp';
import seagrassUnThumb from '../../assets/seagrass_UN.webp';
import seagrassWatchThumb from '../../assets/seagrass_watch.webp';

export type ComponentType = 'Watch' | 'Play' | 'Discuss' | 'Create' | 'Read' | 'Guide';
export type ComponentStage = 'Start here' | 'Explore' | 'Investigate' | 'Reflect' | 'Create' | 'Additional support';

export interface ComponentLink {
  label: string;
  url: string;
}

export interface StoryComponent {
  id: string;
  title: string;
  type: ComponentType;
  stage: ComponentStage;
  audiences: ('Schools' | 'University' | 'Museum')[];
  description: string;
  duration?: string;
  gradeLevel?: string;
  curriculum?: string;
  source?: string;
  isExternal: boolean;
  isWorking: boolean;
  videoId?: string;
  links?: ComponentLink[];
  thumbnail?: string;
}

export interface Story {
  id: string;
  title: string;
  drivingQuestion: string;
  quickFacts: { label: string; value: string }[];
  bannerImage: string;
  components: StoryComponent[];
}

export const STAGES: ComponentStage[] = [
  'Start here',
  'Explore',
  'Investigate',
  'Reflect',
  'Create',
  'Additional support',
];

export const STAGE_DESCRIPTIONS: Record<ComponentStage, string> = {
  'Start here': 'The question and goals that frame this story.',
  Explore: 'Open with curiosity: watch, notice, and wonder.',
  Investigate: 'Dig into how the ocean works through play and evidence.',
  Reflect: 'Pause to consider what was learned and why it matters.',
  Create: 'Put ideas into action by making or doing something new.',
  'Additional support': 'Guides, worksheets and reading for educators.',
};

export const GAME_URL = 'https://seagrassstories-production.up.railway.app/';
export const EDUCATOR_GUIDE_URL = 'https://seagrassstoriesforschools.oceanx.org/educatorguide.html';

export const SEAGRASS_STORIES: Story = {
  id: 'seagrass-stories',
  title: 'Seagrass Stories',
  drivingQuestion: 'What does it take to bring an underwater meadow back to life?',
  quickFacts: [
    { label: 'Ages', value: '12 to 14' },
    { label: 'Duration', value: '60 to 75 min' },
    { label: 'Groups', value: '2 to 3' },
    { label: 'Components', value: '14' },
  ],
  bannerImage: '/src/assets/seagrass-stories.jpeg',
  components: [

    // ── Start here ─────────────────────────────────────────────────────────
    {
      id: 'driving-question',
      title: 'Driving question',
      type: 'Read',
      stage: 'Start here',
      audiences: ['Schools', 'University', 'Museum'],
      description: 'The central question that anchors this story: what does it take to bring an underwater meadow back to life?',
      isExternal: false,
      isWorking: false,
      thumbnail: seagrassQuestionThumb,
    },
    {
      id: 'learning-intention',
      title: 'Learning intentions',
      type: 'Guide',
      stage: 'Start here',
      audiences: ['Schools', 'University', 'Museum'],
      description: 'What learners will explore in this story and how they will share what they learn.',
      isExternal: false,
      isWorking: false,
      thumbnail: seagrassIntentionThumb,
    },

    // ── Explore ────────────────────────────────────────────────────────────
    {
      id: 'video-nada',
      title: 'Meet Nada: a seagrass scientist',
      type: 'Watch',
      stage: 'Explore',
      audiences: ['Schools', 'University', 'Museum'],
      description: 'Nada introduces her work and explains why she chose to study seagrass restoration.',
      duration: '5 min',
      gradeLevel: 'Secondary / Year 7 to 9',
      curriculum: 'Biology, Environmental Science',
      source: 'OceanX Media',
      isExternal: false,
      isWorking: true,
      videoId: '9XX4qY16V9Y',
    },
    {
      id: 'video-changi-point',
      title: 'Changi Point: a meadow in trouble',
      type: 'Watch',
      stage: 'Explore',
      audiences: ['Schools', 'University'],
      description: 'A short film about the seagrass meadow at Changi Point, Singapore.',
      duration: '4 min',
      gradeLevel: 'Secondary / Year 7 to 9',
      curriculum: 'Biology, Geography',
      source: 'YouTube',
      isExternal: true,
      isWorking: true,
      videoId: 'CUiX69oMZ2E',
    },
    {
      id: 'video-ecology-in-action',
      title: 'Ecology in action',
      type: 'Watch',
      stage: 'Explore',
      audiences: ['Schools', 'University'],
      description: 'A short explainer on how seagrass meadows function as ecosystems and support other marine life.',
      duration: '7 min',
      gradeLevel: 'Secondary / Year 7 to 9',
      curriculum: 'Biology',
      source: 'Ecology In Action / YouTube',
      isExternal: true,
      isWorking: false,
      videoId: '0bvOh7qby-c',
    },
    {
      id: 'explore-prompts',
      title: 'What do you notice, what do you wonder?',
      type: 'Discuss',
      stage: 'Explore',
      audiences: ['Schools', 'University'],
      description: 'Pairs or tables share initial observations and questions after watching the opening footage.',
      duration: '10 min',
      gradeLevel: 'Secondary / Year 7 to 9',
      curriculum: 'Science inquiry skills',
      isExternal: false,
      isWorking: false,
      thumbnail: seagrassWonderThumb,
    },

    // ── Investigate ────────────────────────────────────────────────────────
    {
      id: 'game',
      title: 'Seagrass Stories game',
      type: 'Play',
      stage: 'Investigate',
      audiences: ['Schools', 'University', 'Museum'],
      description: 'An interactive game where students make restoration decisions and see the consequences unfold.',
      duration: '20 to 30 min',
      gradeLevel: 'Secondary / Year 7 to 9',
      curriculum: 'Biology, Environmental Science, Science inquiry skills',
      source: 'OceanX Education',
      isExternal: true,
      isWorking: true,
      thumbnail: seagrassGameThumb,
    },
    {
      id: 'investigate-prompts',
      title: 'Investigate prompts',
      type: 'Discuss',
      stage: 'Investigate',
      audiences: ['Schools', 'University'],
      description: 'Discussion prompts to use during and after the game: what restoration decisions did you face, what trade-offs arose, and what would you change?',
      duration: '10 min',
      gradeLevel: 'Secondary / Year 7 to 9',
      curriculum: 'Science inquiry skills',
      isExternal: false,
      isWorking: false,
      thumbnail: seagrassPromptThumb,
    },

    // ── Reflect ────────────────────────────────────────────────────────────
    {
      id: 'reflect-prompts',
      title: 'Who decides what gets restored?',
      type: 'Discuss',
      stage: 'Reflect',
      audiences: ['Schools', 'University', 'Museum'],
      description: 'A structured conversation about the human and political dimensions of conservation decisions.',
      duration: '15 min',
      gradeLevel: 'Secondary / Year 7 to 9',
      curriculum: 'HASS, Environmental Science',
      isExternal: false,
      isWorking: false,
      thumbnail: seagrassRestoreThumb,
    },

    // ── Create ─────────────────────────────────────────────────────────────
    {
      id: 'create-activity',
      title: 'Map the chain: choice, consequence, change',
      type: 'Create',
      stage: 'Create',
      audiences: ['Schools', 'University'],
      description: 'Groups use sticky notes to trace how one decision ripples through a seagrass ecosystem over time.',
      duration: '15 min',
      gradeLevel: 'Secondary / Year 7 to 9',
      curriculum: 'Science inquiry skills, Systems thinking',
      isExternal: false,
      isWorking: true,
      thumbnail: seagrassMapThumb,
    },

    // ── Additional support ─────────────────────────────────────────────────
    {
      id: 'educator-guide',
      title: 'Educator guide',
      type: 'Guide',
      stage: 'Additional support',
      audiences: ['Schools', 'University'],
      description: 'Session plans, timing notes and facilitation tips for each activity in this story.',
      isExternal: true,
      isWorking: false,
      thumbnail: seagrassGuideThumb,
      links: [
        {
          label: 'View the educator guide',
          url: EDUCATOR_GUIDE_URL,
        },
      ],
    },
    {
      id: 'learner-organiser',
      title: 'Learner organiser',
      type: 'Guide',
      stage: 'Additional support',
      audiences: ['Schools', 'University'],
      description: 'A one-page template for learners to record observations, questions and key evidence throughout the session.',
      isExternal: false,
      isWorking: false,
      thumbnail: seagrassOrganiserThumb,
    },
    {
      id: 'further-reading-unep',
      title: 'UNEP: Seagrass meadows',
      type: 'Read',
      stage: 'Additional support',
      audiences: ['Schools', 'University'],
      description: 'Overview of seagrass meadow ecosystems, threats and restoration priorities from the UN Environment Programme.',
      gradeLevel: 'Tertiary',
      curriculum: 'Marine Biology, Environmental Science',
      source: 'UNEP',
      isExternal: true,
      isWorking: false,
      thumbnail: seagrassUnThumb,
      links: [
        {
          label: 'Read on UNEP website',
          url: 'https://www.unep.org/topics/ocean-seas-and-coasts/blue-ecosystems/seagrass-meadows',
        },
      ],
    },
    {
      id: 'further-reading-seagrass-watch',
      title: 'Seagrass-Watch: Why seagrass matters',
      type: 'Read',
      stage: 'Additional support',
      audiences: ['Schools', 'University'],
      description: 'Why seagrass meadows matter for marine life, carbon storage and coastlines.',
      gradeLevel: 'Tertiary',
      curriculum: 'Marine Biology, Environmental Science',
      source: 'Seagrass-Watch',
      isExternal: true,
      isWorking: false,
      thumbnail: seagrassWatchThumb,
      links: [
        {
          label: 'Read on Seagrass-Watch website',
          url: 'https://www.seagrasswatch.org/seagrassimportance/',
        },
      ],
    },
  ],
};
