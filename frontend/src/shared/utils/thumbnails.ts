import { SEAGRASS_STORIES } from '../data/seagrass-stories';
import type { StoryComponent } from '../data/seagrass-stories';

export interface ComponentThumb {
  src: string;
  alt: string;
  type: string;
  duration?: string;
}

export function getComponent(componentId: string): StoryComponent | undefined {
  return SEAGRASS_STORIES.components.find((c) => c.id === componentId);
}

export function getComponentThumb(componentId: string): ComponentThumb | null {
  const component = getComponent(componentId);
  if (!component) return null;

  let src: string | null = null;
  if (component.thumbnail) {
    src = component.thumbnail;
  } else if (component.videoId) {
    src = `https://img.youtube.com/vi/${component.videoId}/maxresdefault.jpg`;
  }

  if (!src) return null;

  return {
    src,
    alt: component.title,
    type: component.type,
    duration: component.duration,
  };
}