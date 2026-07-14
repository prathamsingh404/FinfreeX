import * as React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      // iconify-icon is a web component: it accepts the standard `class` attribute
      // (in addition to React's `className`). Both are allowed here.
      'iconify-icon': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { icon?: string; width?: string | number; height?: string | number; rotate?: string | number; flip?: string; mode?: string; inline?: boolean; class?: string; }, HTMLElement>;
    }
  }
}
