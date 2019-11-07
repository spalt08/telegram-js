import { Mutatable } from './mutation';

/**
 * Types that can be mounted to DOM element using mount() function
 */
export type Child = Node | HTMLDivElement | Mutatable<string | number> | string | number;
