const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.BCdvwKfv.js",app:"_app/immutable/entry/app.C4Ok1qXn.js",imports:["_app/immutable/entry/start.BCdvwKfv.js","_app/immutable/chunks/DAVta-Xa.js","_app/immutable/chunks/hXfxUh-I.js","_app/immutable/chunks/BXEmufX1.js","_app/immutable/entry/app.C4Ok1qXn.js","_app/immutable/chunks/hXfxUh-I.js","_app/immutable/chunks/yb7IgdBk.js","_app/immutable/chunks/CqN6I-N2.js","_app/immutable/chunks/BXEmufX1.js","_app/immutable/chunks/DntpN0o6.js","_app/immutable/chunks/B2t9Uoew.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js-B6c0Gl5F.js')),
			__memo(() => import('./nodes/1.js-BA_K5YIO.js')),
			__memo(() => import('./nodes/2.js-Y1J9vjJr.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

export { manifest as m };
//# sourceMappingURL=manifest.js-WJp3T6TJ.js.map
