/** Strict string compare — "false" is truthy in JS, so never use truthiness. */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";
