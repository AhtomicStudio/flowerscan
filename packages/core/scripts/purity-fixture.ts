// Deliberately impure. Each line must be a compile error under packages/core/tsconfig.json.
export const title = document.title;
export const agent = navigator.userAgent;
export const env = process.env;
