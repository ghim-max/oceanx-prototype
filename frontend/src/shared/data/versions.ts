import type { Version } from '../types';

export const versions: Version[] = [
  {
    id: 'v-schools',
    title: 'Seagrass Stories: Schools',
    audience: 'Schools',
    componentIds: ['c01', 'c02', 'c03', 'c06', 'c07'],
    description:
      'Designed for secondary classrooms (Years 7-12). Combines footage and narrative with structured inquiry activities aligned to Earth and Environmental Science curricula.',
  },
  {
    id: 'v-university',
    title: 'Seagrass Stories: University',
    audience: 'University',
    componentIds: ['c01', 'c02', 'c04', 'c05', 'c10', 'c12'],
    description:
      'For undergraduate marine biology and environmental science students. Includes primary data, adaptive quiz and two case study narratives.',
  },
  {
    id: 'v-museum',
    title: 'Seagrass Stories: Museum',
    audience: 'Museum',
    componentIds: ['c02', 'c04', 'c08', 'c09', 'c11'],
    description:
      'Self-guided experience for museum visitors of all ages. Emphasises short films, plain-language findings and hands-on decision activities.',
  },
];
