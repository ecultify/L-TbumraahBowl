import type { CSSProperties, DetailedHTMLProps, HTMLAttributes } from "react";

type Booleanish = boolean | "true" | "false";

interface LottiePlayerAttributes extends HTMLAttributes<HTMLElement> {
  src?: string;
  background?: string;
  speed?: string | number;
  loop?: Booleanish;
  autoplay?: Booleanish;
  mode?: string;
  style?: CSSProperties;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'lottie-player': DetailedHTMLProps<LottiePlayerAttributes, HTMLElement>;
    }
  }
}

export {};
