import 'mdast';

declare module 'mdast' {
  interface Math {
    type: 'math';
    value: string;
    meta?: string | null;
  }

  interface InlineMath {
    type: 'inlineMath';
    value: string;
  }

  interface RootContentMap {
    math: Math;
  }

  interface PhrasingContentMap {
    inlineMath: InlineMath;
  }
}
