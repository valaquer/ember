import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port: 51760,
		host: '0.0.0.0',
		allowedHosts: true
	},
	preview: {
		port: 51760
	}
});
