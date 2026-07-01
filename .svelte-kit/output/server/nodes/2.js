import * as server from '../entries/pages/_page.server.ts.js';

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/+page.server.ts";
export const imports = ["_app/immutable/nodes/2._n8XcgVK.js","_app/immutable/chunks/CqN6I-N2.js","_app/immutable/chunks/hXfxUh-I.js","_app/immutable/chunks/BXEmufX1.js","_app/immutable/chunks/yb7IgdBk.js","_app/immutable/chunks/DntpN0o6.js","_app/immutable/chunks/B2t9Uoew.js"];
export const stylesheets = [];
export const fonts = [];
