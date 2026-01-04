import 'mdast';

declare module 'mdast' {
  interface Math {
    type: 'math';
    value: string;
    meta?: string | null;
  }

  interface RootContentMap {
    math: Math;
  }
}
