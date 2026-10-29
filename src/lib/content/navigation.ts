export type ContentKind = 'thoughts' | 'articles' | 'photography' | 'collection';

export type SceneName = 'paper-slip' | 'essay-pavilion' | 'image-corridor' | 'moon-tree';

export interface SceneDestination {
  id: string;
  kind: ContentKind;
  scene: SceneName;
  slug: string;
}

const scenes: Record<ContentKind, SceneName> = {
  thoughts: 'paper-slip',
  articles: 'essay-pavilion',
  photography: 'image-corridor',
  collection: 'moon-tree',
};

export function destinationFor(kind: ContentKind, slug: string): SceneDestination {
  const scene = scenes[kind];
  return { id: `${scene}:${slug}`, kind, scene, slug };
}
