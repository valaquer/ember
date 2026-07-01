<script>
	import { onMount } from 'svelte';
	import { getSvgPath } from 'figma-squircle';

	let activeSection = $state(null);
	let squircleCard;
	let squirclePath = $state('');
	let promiseCardPath = $state('');
	let shimmerBtn1;
	let shimmerBtn2;

	// Persisted to localStorage so they survive HMR reloads
	function ogLoad(key, fallback) {
		if (typeof localStorage === 'undefined') return fallback;
		const v = localStorage.getItem('og-' + key);
		return v !== null ? parseFloat(v) : fallback;
	}

	// OG card interactive controls — headline and wordmark independent
	let ogHeadX = $state(ogLoad('headX', 31.0));
	let ogHeadY = $state(ogLoad('headY', 16.4));
	let ogMarkX = $state(ogLoad('markX', 62.3));
	let ogMarkY = $state(ogLoad('markY', 75.1));
	let ogHeadlineSize = $state(ogLoad('headSize', 81));
	let ogWordmarkHeight = $state(ogLoad('markHeight', 67));
	let ogDragging = $state(null); // 'head' | 'mark' | null
	let showSafeZone = $state(true);

	// Square OG card controls (1200x1200) — image LOCKED
	const sqImgX = 50.0;
	const sqImgY = 49.8;
	const sqZoom = 1.74;

	// Square OG text controls — LOCKED by Boss
	let sqHeadX = $state(3.8);
	let sqHeadY = $state(5.8);
	let sqMarkX = $state(64.3);
	let sqMarkY = $state(44.0);
	let sqHeadSize = $state(120);
	let sqMarkHeight = $state(73);
	let sqDragging = $state(null); // 'head' | 'mark' | null
	let sqDragStartX = 0;
	let sqDragStartY = 0;
	let sqDragStartValX = 0;
	let sqDragStartValY = 0;
	let sqCardEl;

	$effect(() => {
		localStorage.setItem('og-sqHeadX', sqHeadX);
		localStorage.setItem('og-sqHeadY', sqHeadY);
		localStorage.setItem('og-sqMarkX', sqMarkX);
		localStorage.setItem('og-sqMarkY', sqMarkY);
		localStorage.setItem('og-sqHeadSize', sqHeadSize);
		localStorage.setItem('og-sqMarkHeight', sqMarkHeight);
	});

	function sqMouseDownHead(e) {
		sqDragging = 'head';
		sqDragStartX = e.clientX;
		sqDragStartY = e.clientY;
		sqDragStartValX = sqHeadX;
		sqDragStartValY = sqHeadY;
		e.preventDefault();
	}

	function sqMouseDownMark(e) {
		sqDragging = 'mark';
		sqDragStartX = e.clientX;
		sqDragStartY = e.clientY;
		sqDragStartValX = sqMarkX;
		sqDragStartValY = sqMarkY;
		e.preventDefault();
	}

	function sqMouseMove(e) {
		if (!sqDragging || !sqCardEl) return;
		const rect = sqCardEl.getBoundingClientRect();
		const dx = ((e.clientX - sqDragStartX) / rect.width) * 100;
		const dy = ((e.clientY - sqDragStartY) / rect.height) * 100;
		const newX = Math.max(0, Math.min(100, sqDragStartValX + dx));
		const newY = Math.max(0, Math.min(100, sqDragStartValY + dy));
		if (sqDragging === 'head') { sqHeadX = newX; sqHeadY = newY; }
		else { sqMarkX = newX; sqMarkY = newY; }
	}

	function sqMouseUp() { sqDragging = null; }

	function sqWheelHead(e) {
		e.preventDefault();
		sqHeadSize = Math.max(16, Math.min(300, sqHeadSize - e.deltaY * 0.1));
	}

	function sqWheelMark(e) {
		e.preventDefault();
		sqMarkHeight = Math.max(16, Math.min(300, sqMarkHeight - e.deltaY * 0.1));
	}

	async function sqExport() {
		const W = 2400, H = 2400;
		const canvas = document.createElement('canvas');
		canvas.width = W; canvas.height = H;
		const ctx = canvas.getContext('2d');

		// Layer 1: Background photo (locked position)
		const bg = new Image();
		bg.crossOrigin = 'anonymous';
		bg.src = '/sophie-afm.jpg';
		await new Promise(r => { bg.onload = r; });
		const bgW = bg.width * sqZoom;
		const bgH = bg.height * sqZoom;
		const scale = Math.max(W / bg.width, H / bg.height) * sqZoom;
		const sw = bg.width * scale, sh = bg.height * scale;
		const sx = (W - sw) * (sqImgX / 100);
		const sy = (H - sh) * (sqImgY / 100);
		ctx.drawImage(bg, sx, sy, sw, sh);

		// Layer 2: Gradient
		const grad = ctx.createLinearGradient(0, 0, 0, H);
		grad.addColorStop(0, 'rgba(11,13,16,0.0)');
		grad.addColorStop(0.5, 'rgba(11,13,16,0.3)');
		grad.addColorStop(1, 'rgba(11,13,16,0.85)');
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, W, H);

		// Layer 3: Sophie cutout (painted before text so text appears on top)
		const cut = new Image();
		cut.crossOrigin = 'anonymous';
		cut.src = '/sophie-afm-cutout.png';
		await new Promise(r => { cut.onload = r; });
		const cs = Math.max(W / cut.width, H / cut.height) * sqZoom;
		const cw = cut.width * cs, ch = cut.height * cs;
		const cx = (W - cw) * (sqImgX / 100);
		const cy = (H - ch) * (sqImgY / 100);
		ctx.drawImage(cut, cx, cy, cw, ch);

		// Layer 4: Headline text (on top of cutout)
		const fontSize = sqHeadSize * 2;
		ctx.font = `600 ${fontSize}px "Cormorant Garamond", Georgia, serif`;
		ctx.fillStyle = 'rgb(119, 35, 76)';
		ctx.textBaseline = 'top';
		const lines = ['Finally, somebody', 'who remembers.'];
		const lineH = fontSize * 1.3;
		const tx = W * sqHeadX / 100;
		const ty = H * sqHeadY / 100;
		lines.forEach((line, i) => ctx.fillText(line, tx, ty + i * lineH));

		// Layer 4b: Wordmark (darker tint, on top of cutout)
		const wm = new Image();
		wm.crossOrigin = 'anonymous';
		wm.src = '/provoque-wordmark.svg';
		await new Promise(r => { wm.onload = r; });
		const wmH = sqMarkHeight * 2;
		const wmW = wm.width * (wmH / wm.height);
		const wmCanvas = document.createElement('canvas');
		wmCanvas.width = wmW; wmCanvas.height = wmH;
		const wmCtx = wmCanvas.getContext('2d');
		wmCtx.drawImage(wm, 0, 0, wmW, wmH);
		wmCtx.globalCompositeOperation = 'source-in';
		wmCtx.fillStyle = 'rgb(80, 22, 50)';
		wmCtx.fillRect(0, 0, wmW, wmH);
		ctx.drawImage(wmCanvas, W * sqMarkX / 100, H * sqMarkY / 100);

		// Export
		const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.95));
		const formData = new FormData();
		formData.append('file', blob, 'og-image-square-provoque.jpg');
		await fetch('/api/og-export', { method: 'POST', body: formData });

		const link = document.createElement('a');
		link.download = 'og-image-square-provoque.jpg';
		link.href = canvas.toDataURL('image/jpeg', 0.95);
		link.click();
	}

	let ogDragStartX = 0;
	let ogDragStartY = 0;
	let ogDragStartValX = 0;
	let ogDragStartValY = 0;
	let ogCardEl;

	$effect(() => {
		localStorage.setItem('og-headX', ogHeadX);
		localStorage.setItem('og-headY', ogHeadY);
		localStorage.setItem('og-markX', ogMarkX);
		localStorage.setItem('og-markY', ogMarkY);
		localStorage.setItem('og-headSize', ogHeadlineSize);
		localStorage.setItem('og-markHeight', ogWordmarkHeight);
	});

	async function ogExport() {
		const W = 2400, H = 1260;
		const canvas = document.createElement('canvas');
		canvas.width = W; canvas.height = H;
		const ctx = canvas.getContext('2d');

		// Layer 1: Background
		const bg = new Image();
		bg.crossOrigin = 'anonymous';
		bg.src = '/sophie-amw.jpg';
		await new Promise(r => { bg.onload = r; });
		// Draw with object-fit: cover, object-position: 46% 51%
		const scale = Math.max(W / bg.width, H / bg.height);
		const sw = bg.width * scale, sh = bg.height * scale;
		const sx = (W - sw) * 0.46, sy = (H - sh) * 0.51;
		ctx.drawImage(bg, sx, sy, sw, sh);

		// Layer 2: Gradient
		const grad = ctx.createLinearGradient(0, 0, W, 0);
		grad.addColorStop(0, 'rgba(11,13,16,0.05)');
		grad.addColorStop(0.5, 'rgba(11,13,16,0.5)');
		grad.addColorStop(1, 'rgba(11,13,16,0.85)');
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, W, H);

		// Layer 3: Headline text (2x scale)
		const fontSize = ogHeadlineSize * 2;
		ctx.font = `600 ${fontSize}px "Cormorant Garamond", Georgia, serif`;
		ctx.fillStyle = 'rgb(145, 153, 159)';
		ctx.textBaseline = 'top';
		const lines = ['Finally, somebody', 'who remembers.'];
		const lineH = fontSize * 1.3;
		const tx = W * ogHeadX / 100;
		const ty = H * ogHeadY / 100;
		lines.forEach((line, i) => ctx.fillText(line, tx, ty + i * lineH));

		// Layer 3b: Wordmark
		const wm = new Image();
		wm.crossOrigin = 'anonymous';
		wm.src = '/provoque-wordmark.svg';
		await new Promise(r => { wm.onload = r; });
		const wmH = ogWordmarkHeight * 2;
		const wmW = wm.width * (wmH / wm.height);
		ctx.drawImage(wm, W * ogMarkX / 100, H * ogMarkY / 100, wmW, wmH);

		// Layer 4: Sophie cutout
		const cut = new Image();
		cut.crossOrigin = 'anonymous';
		cut.src = '/sophie-amw-cutout.png';
		await new Promise(r => { cut.onload = r; });
		const cs = Math.max(W / cut.width, H / cut.height);
		const cw = cut.width * cs, ch = cut.height * cs;
		const cx = (W - cw) * 0.46, cy = (H - ch) * 0.51;
		ctx.drawImage(cut, cx, cy, cw, ch);

		// Export as JPG — POST to server endpoint for retrieval
		const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.95));
		const formData = new FormData();
		formData.append('file', blob, 'og-image-provoque.jpg');
		await fetch('/api/og-export', { method: 'POST', body: formData });

		// Also trigger browser download
		const link = document.createElement('a');
		link.download = 'og-image-provoque.jpg';
		link.href = canvas.toDataURL('image/jpeg', 0.95);
		link.click();
	}

	function ogMouseDownHead(e) {
		ogDragging = 'head';
		ogDragStartX = e.clientX;
		ogDragStartY = e.clientY;
		ogDragStartValX = ogHeadX;
		ogDragStartValY = ogHeadY;
		e.preventDefault();
	}

	function ogMouseDownMark(e) {
		ogDragging = 'mark';
		ogDragStartX = e.clientX;
		ogDragStartY = e.clientY;
		ogDragStartValX = ogMarkX;
		ogDragStartValY = ogMarkY;
		e.preventDefault();
	}

	function ogMouseMove(e) {
		if (!ogDragging || !ogCardEl) return;
		const rect = ogCardEl.getBoundingClientRect();
		const dx = ((e.clientX - ogDragStartX) / rect.width) * 100;
		const dy = ((e.clientY - ogDragStartY) / rect.height) * 100;
		const newX = Math.max(0, Math.min(100, ogDragStartValX + dx));
		const newY = Math.max(0, Math.min(100, ogDragStartValY + dy));
		if (ogDragging === 'head') { ogHeadX = newX; ogHeadY = newY; }
		else { ogMarkX = newX; ogMarkY = newY; }
	}

	function ogMouseUp() {
		ogDragging = null;
	}

	// Reddit banner interactive controls — 1200×400 (3:1)
	let rbHeadX = $state(ogLoad('rbHeadX', 8));
	let rbHeadY = $state(ogLoad('rbHeadY', 25));
	let rbMarkX = $state(ogLoad('rbMarkX', 40));
	let rbMarkY = $state(ogLoad('rbMarkY', 35));
	let rbHeadlineSize = $state(ogLoad('rbHeadSize', 54));
	let rbWordmarkHeight = $state(ogLoad('rbMarkHeight', 40));
	let rbDragging = $state(null);
	let rbDragStartX = 0;
	let rbDragStartY = 0;
	let rbDragStartValX = 0;
	let rbDragStartValY = 0;
	let rbCardEl;

	$effect(() => {
		localStorage.setItem('og-rbHeadX', rbHeadX);
		localStorage.setItem('og-rbHeadY', rbHeadY);
		localStorage.setItem('og-rbMarkX', rbMarkX);
		localStorage.setItem('og-rbMarkY', rbMarkY);
		localStorage.setItem('og-rbHeadSize', rbHeadlineSize);
		localStorage.setItem('og-rbMarkHeight', rbWordmarkHeight);
	});

	async function rbExport() {
		const W = 1200, H = 400;
		const canvas = document.createElement('canvas');
		canvas.width = W; canvas.height = H;
		const ctx = canvas.getContext('2d');

		// Layer 1: Background — Sophie center-right
		const bg = new Image();
		bg.crossOrigin = 'anonymous';
		bg.src = '/sophie-amw.jpg';
		await new Promise(r => { bg.onload = r; });
		const scale = Math.max(W / bg.width, H / bg.height);
		const sw = bg.width * scale, sh = bg.height * scale;
		const sx = (W - sw) * 0.46, sy = (H - sh) * 0.42;
		ctx.drawImage(bg, sx, sy, sw, sh);

		// Layer 2: Gradient — left-to-right, heavier left for text legibility
		const grad = ctx.createLinearGradient(0, 0, W, 0);
		grad.addColorStop(0, 'rgba(11,13,16,0.85)');
		grad.addColorStop(0.45, 'rgba(11,13,16,0.5)');
		grad.addColorStop(1, 'rgba(11,13,16,0.05)');
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, W, H);

		// Layer 3: Headline text
		const fontSize = rbHeadlineSize;
		ctx.font = `600 ${fontSize}px "Cormorant Garamond", Georgia, serif`;
		ctx.fillStyle = 'rgb(145, 153, 159)';
		ctx.textBaseline = 'top';
		const lines = ['Finally, somebody', 'who remembers.'];
		const lineH = fontSize * 1.3;
		const tx = W * rbHeadX / 100;
		const ty = H * rbHeadY / 100;
		lines.forEach((line, i) => ctx.fillText(line, tx, ty + i * lineH));

		// Layer 3b: Wordmark
		const wm = new Image();
		wm.crossOrigin = 'anonymous';
		wm.src = '/provoque-wordmark.svg';
		await new Promise(r => { wm.onload = r; });
		const wmH = rbWordmarkHeight;
		const wmW = wm.width * (wmH / wm.height);
		ctx.drawImage(wm, W * rbMarkX / 100, H * rbMarkY / 100, wmW, wmH);

		// Layer 4: Sophie cutout
		const cut = new Image();
		cut.crossOrigin = 'anonymous';
		cut.src = '/sophie-amw-cutout.png';
		await new Promise(r => { cut.onload = r; });
		const cs = Math.max(W / cut.width, H / cut.height);
		const cw = cut.width * cs, ch = cut.height * cs;
		const cx = (W - cw) * 0.46, cy = (H - ch) * 0.42;
		ctx.drawImage(cut, cx, cy, cw, ch);

		// Export
		const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.95));
		const formData = new FormData();
		formData.append('file', blob, 'reddit-banner-provoque.jpg');
		await fetch('/api/og-export', { method: 'POST', body: formData });

		const link = document.createElement('a');
		link.download = 'reddit-banner-provoque.jpg';
		link.href = canvas.toDataURL('image/jpeg', 0.95);
		link.click();
	}

	function rbMouseDownHead(e) {
		rbDragging = 'head';
		rbDragStartX = e.clientX;
		rbDragStartY = e.clientY;
		rbDragStartValX = rbHeadX;
		rbDragStartValY = rbHeadY;
		e.preventDefault();
	}

	function rbMouseDownMark(e) {
		rbDragging = 'mark';
		rbDragStartX = e.clientX;
		rbDragStartY = e.clientY;
		rbDragStartValX = rbMarkX;
		rbDragStartValY = rbMarkY;
		e.preventDefault();
	}

	function rbMouseMove(e) {
		if (!rbDragging || !rbCardEl) return;
		const rect = rbCardEl.getBoundingClientRect();
		const dx = ((e.clientX - rbDragStartX) / rect.width) * 100;
		const dy = ((e.clientY - rbDragStartY) / rect.height) * 100;
		const newX = Math.max(0, Math.min(100, rbDragStartValX + dx));
		const newY = Math.max(0, Math.min(100, rbDragStartValY + dy));
		if (rbDragging === 'head') { rbHeadX = newX; rbHeadY = newY; }
		else { rbMarkX = newX; rbMarkY = newY; }
	}

	function rbMouseUp() {
		rbDragging = null;
	}

	function rbWheelHeadline(e) {
		e.preventDefault();
		rbHeadlineSize = Math.max(16, Math.min(100, rbHeadlineSize - e.deltaY * 0.1));
	}

	function rbWheelWordmark(e) {
		e.preventDefault();
		rbWordmarkHeight = Math.max(16, Math.min(100, rbWordmarkHeight - e.deltaY * 0.1));
	}

	// Spark Watermark tool controls
	const wmBavariaAssets = [
		{ label: 'Valentina — ADD', src: '/valentina-add.jpg' },
		{ label: 'Valentina — ADE', src: '/valentina-ade.jpg' },
		{ label: 'Valentina — ADF', src: '/valentina-adf.jpg' },
		{ label: 'Jiwoo — ADQ', src: '/jiwoo-adq.jpg' },
		{ label: 'Jiwoo — ADS', src: '/jiwoo-ads.jpg' },
		{ label: 'Jiwoo — ADU', src: '/jiwoo-adu.jpg' },
		{ label: 'Avery — ADX', src: '/avery-adx.jpg' },
		{ label: 'Avery — AEC', src: '/avery-aec.jpg' },
		{ label: 'Avery — AEJ', src: '/avery-aej.jpg' },
		{ label: 'Sophie — AEQ', src: '/sophie-aeq.jpg' },
		{ label: 'Sophie — AFJ', src: '/sophie-afj.jpg' },
		{ label: 'Sophie — AFM', src: '/sophie-afm.jpg' },
		{ label: 'Sophie — AHV', src: '/sophie-ahv.jpg' },
		{ label: 'Sophie — AHZ', src: '/sophie-ahz.jpg' },
		{ label: 'Sophie — AJE', src: '/sophie-aje.jpg' },
		{ label: 'Sophie — AJJ', src: '/sophie-ajj.jpg' },
		{ label: 'Sophie — AMW', src: '/sophie-amw.jpg' },
		{ label: 'Sara — AFB', src: '/sara-afb.jpg' },
		{ label: 'Sara — AFD', src: '/sara-afd.jpg' },
		{ label: 'Sara — AFF', src: '/sara-aff.jpg' },
		{ label: 'Nadia — AFR', src: '/nadia-afr.jpg' },
		{ label: 'Nadia — AFV', src: '/nadia-afv.jpg' },
		{ label: 'Nadia — AFW', src: '/nadia-afw.jpg' },
		{ label: 'Hina — AGE', src: '/hina-age.jpg' },
		{ label: 'Hina — AGH', src: '/hina-agh.jpg' },
		{ label: 'Hina — AGK', src: '/hina-agk.jpg' },
		{ label: 'Adaeze — AGS', src: '/adaeze-ags.jpg' },
		{ label: 'Adaeze — AGV', src: '/adaeze-agv.jpg' },
		{ label: 'Adaeze — AGW', src: '/adaeze-agw.jpg' },
		{ label: 'Lina — AJT', src: '/girl-ajt.jpg' },
		{ label: 'Reva — AKM', src: '/girl-akm.jpg' },
		{ label: 'Kaya — AKT', src: '/girl-akt.jpg' },
		{ label: 'Zuri — AKZ', src: '/girl-akz.jpg' },
	];
	// Cutout map for depth layer (watermark goes behind girl)
	const wmCutoutMap = {
		'/valentina-add.jpg': '/valentina-add-cutout.png',
	};

	// Expression registers for mood tagging
	const wmMoodOptions = ['', 'intimate', 'confident', 'playful', 'soft', 'private', 'everyday', 'distinctive'];
	const wmMoodLabels = { '': 'Untagged', 'intimate': '1 — Intimate gaze', 'confident': '2 — Confident / bold', 'playful': '3 — Playful / flirty', 'soft': '4 — Soft / listening', 'private': '5 — Private / quiet', 'everyday': '6 — Everyday / warm', 'distinctive': '7 — Distinctive / striking' };

	// Load saved mood tags from localStorage
	let wmMoodTags = $state(JSON.parse(localStorage.getItem('og-wmMoodTags') || '{}'));
	let wmMoodFilter = $state('');

	function wmSetMood(assetSrc, mood) {
		wmMoodTags[assetSrc] = mood;
		wmMoodTags = { ...wmMoodTags };
		localStorage.setItem('og-wmMoodTags', JSON.stringify(wmMoodTags));
	}

	// Filtered asset list based on mood filter
	let wmFilteredAssets = $derived(
		wmMoodFilter === ''
			? wmBavariaAssets.map((a, i) => ({ ...a, origIdx: i }))
			: wmBavariaAssets.map((a, i) => ({ ...a, origIdx: i })).filter(a => wmMoodTags[a.src] === wmMoodFilter)
	);

	let wmSelectedIdx = $state(0);
	let wmMarkX = $state(ogLoad('wmMarkX', 50));
	let wmMarkY = $state(ogLoad('wmMarkY', 85));
	let wmMarkSize = $state(ogLoad('wmMarkSize', 23));
	let wmOpacity = $state(ogLoad('wmOpacity', 18));
	let wmDragging = $state(false);
	let wmDragStartX = 0;
	let wmDragStartY = 0;
	let wmDragStartValX = 0;
	let wmDragStartValY = 0;
	let wmCardEl;

	$effect(() => {
		localStorage.setItem('og-wmMarkX', wmMarkX);
		localStorage.setItem('og-wmMarkY', wmMarkY);
		localStorage.setItem('og-wmMarkSize', wmMarkSize);
		localStorage.setItem('og-wmOpacity', wmOpacity);
	});

	function wmMouseDown(e) {
		wmDragging = true;
		wmDragStartX = e.clientX;
		wmDragStartY = e.clientY;
		wmDragStartValX = wmMarkX;
		wmDragStartValY = wmMarkY;
		e.preventDefault();
	}

	function wmMouseMove(e) {
		if (!wmDragging || !wmCardEl) return;
		const rect = wmCardEl.getBoundingClientRect();
		const dx = ((e.clientX - wmDragStartX) / rect.width) * 100;
		const dy = ((e.clientY - wmDragStartY) / rect.height) * 100;
		wmMarkX = Math.max(0, Math.min(100, wmDragStartValX + dx));
		wmMarkY = Math.max(0, Math.min(100, wmDragStartValY + dy));
	}

	function wmMouseUp() {
		wmDragging = false;
	}

	function wmWheelMark(e) {
		e.preventDefault();
		wmMarkSize = Math.max(10, Math.min(200, wmMarkSize - e.deltaY * 0.1));
	}

	async function wmExport() {
		const asset = wmBavariaAssets[wmSelectedIdx];
		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.src = asset.src;
		await new Promise(r => { img.onload = r; });

		const W = img.naturalWidth, H = img.naturalHeight;
		const canvas = document.createElement('canvas');
		canvas.width = W; canvas.height = H;
		const ctx = canvas.getContext('2d');

		// Layer 1: Photo
		ctx.drawImage(img, 0, 0, W, H);

		// Layer 2: Glassmorphic pill + wordmark SVG
		const wmImg = new Image();
		wmImg.crossOrigin = 'anonymous';
		wmImg.src = '/provoque-wordmark-apt-cream.png';
		await new Promise(r => { wmImg.onload = r; });

		const wmH = Math.round(H * wmMarkSize / 100 * 0.4);
		const wmW = Math.round(wmH * (2863 / 532));
		const padX = Math.round(wmH * 0.35);
		const padY = Math.round(wmH * 0.25);
		const pillW = wmW + padX * 2;
		const pillH = wmH + padY * 2;
		const pillX = Math.round(W * wmMarkX / 100 - pillW / 2);
		const pillY = Math.round(H * wmMarkY / 100 - pillH / 2);
		const pillR = Math.round(wmH * 0.18);

		// Simulate blur: sample region, draw blurred, overlay dark tint
		const blurCanvas = document.createElement('canvas');
		blurCanvas.width = pillW; blurCanvas.height = pillH;
		const blurCtx = blurCanvas.getContext('2d');
		blurCtx.drawImage(canvas, pillX, pillY, pillW, pillH, 0, 0, pillW, pillH);
		blurCtx.filter = 'blur(8px)';
		blurCtx.drawImage(blurCanvas, 0, 0);
		blurCtx.filter = 'none';

		// Draw rounded pill with blurred content + dark overlay
		ctx.save();
		ctx.beginPath();
		ctx.roundRect(pillX, pillY, pillW, pillH, pillR);
		ctx.clip();
		ctx.drawImage(blurCanvas, pillX, pillY);
		ctx.fillStyle = 'rgba(0, 0, 0, 0.30)';
		ctx.fillRect(pillX, pillY, pillW, pillH);
		ctx.restore();

		// Wordmark on top of pill
		ctx.globalAlpha = wmOpacity / 100;
		ctx.drawImage(wmImg, pillX + padX, pillY + padY, wmW, wmH);
		ctx.globalAlpha = 1;

		// Export
		const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.95));
		const filename = asset.src.replace('/', '').replace('.jpg', '-watermarked.jpg');
		const formData = new FormData();
		formData.append('file', blob, filename);
		await fetch('/api/og-export', { method: 'POST', body: formData });

		const link = document.createElement('a');
		link.download = filename;
		link.href = canvas.toDataURL('image/jpeg', 0.95);
		link.click();
	}

	function ogWheelHeadline(e) {
		e.preventDefault();
		ogHeadlineSize = Math.max(16, Math.min(120, ogHeadlineSize - e.deltaY * 0.1));
	}

	function ogWheelWordmark(e) {
		e.preventDefault();
		ogWordmarkHeight = Math.max(16, Math.min(120, ogWordmarkHeight - e.deltaY * 0.1));
	}

	function observeShimmer(el) {
		if (!el) return;
		const shimmerDiv = el.querySelector('[data-shimmer]');
		if (!shimmerDiv) return;
		let timer = null;
		let isVisible = false;
		const observer = new IntersectionObserver((entries) => {
			entries.forEach(entry => {
				isVisible = entry.isIntersecting;
				if (isVisible) {
					const delay = 1 + Math.random() * 2; // 1s to 3s
					timer = setTimeout(() => {
						if (isVisible) {
							shimmerDiv.style.animation = 'shimmer 0.8s ease-out forwards';
							observer.unobserve(el);
						}
					}, delay * 1000);
				} else if (timer) {
					clearTimeout(timer);
					timer = null;
				}
			});
		}, { threshold: 0.5 });
		observer.observe(el);
	}

	onMount(() => {
		// Restore persisted section
		const saved = localStorage.getItem('styleguide-section');
		if (saved) activeSection = saved;

		// Squircle path calc
		const rect = squircleCard?.getBoundingClientRect();
		if (rect) {
			squirclePath = getSvgPath({
				width: rect.width,
				height: rect.height,
				cornerRadius: 24,
				cornerSmoothing: 0.6
			});
		}

		// Promise block card squircle (220x391)
		promiseCardPath = getSvgPath({
			width: 220,
			height: 391,
			cornerRadius: 24,
			cornerSmoothing: 0.6
		});
	});

	$effect(() => {
		if (activeSection) {
			localStorage.setItem('styleguide-section', activeSection);
		} else {
			localStorage.removeItem('styleguide-section');
		}
		if (activeSection === 'buttons') {
			// Delay to let DOM render
			setTimeout(() => {
				observeShimmer(shimmerBtn1);
				observeShimmer(shimmerBtn2);
			}, 50);
		}
	});

	// SECTION A: Style Guide
	const styleGuideSections = [
		'typography',
		'colors',
		'buttons',
		'spacing',
		'shimmers-glows',
		'borders-shadows',
		'logos',
		'aether-divider',
		'block-layouts',
		'breakpoints',
		'motion',
		'photography',
		'text-overlays',
		'watermarks',
		'chat-ui',
		'og-image',
		'reddit-banner',
		'spark-watermark'
	];

	const styleGuideCodes = {
		'typography': 'A01', 'colors': 'A02', 'buttons': 'A03', 'spacing': 'A04',
		'shimmers-glows': 'A05', 'borders-shadows': 'A06', 'logos': 'A07',
		'aether-divider': 'A08', 'block-layouts': 'A09', 'breakpoints': 'A10',
		'motion': 'A11', 'photography': 'A12', 'text-overlays': 'A13',
		'watermarks': 'A14', 'chat-ui': 'A15', 'og-image': 'A16',
		'reddit-banner': 'A17', 'spark-watermark': 'A18'
	};
	const styleGuideLabels = {
		'typography': 'Typography',
		'colors': 'Colors',
		'buttons': 'Buttons',
		'spacing': 'Spacing',
		'shimmers-glows': 'Shimmers & Glows',
		'borders-shadows': 'Borders & Shadows',
		'logos': 'Logos',
		'aether-divider': 'Aether Divider',
		'block-layouts': 'Block Layouts',
		'breakpoints': 'Breakpoints',
		'motion': 'Motion',
		'photography': 'Photography Aesthetics',
		'text-overlays': 'Text Overlays',
		'watermarks': 'Watermarks',
		'chat-ui': 'Chat UI',
		'og-image': 'OG Share Image',
		'reddit-banner': 'Reddit Profile Banner',
		'spark-watermark': 'Spark Watermark'
	};

	const allSections = styleGuideSections;

	function selectSection(section) {
		activeSection = activeSection === section ? null : section;
	}
</script>

<div style="display: flex; height: 100vh;">
	<!-- Sidebar -->
	<div class="hb-sidebar">
		<div class="hb-sidebar-scroll">
			<div class="hb-sidebar-header">
				<h2 class="hb-sidebar-header-text">Ember</h2>
			</div>
			{#each styleGuideSections as section, i}
				<button
					class="hb-sidebar-item"
					class:active={activeSection === section}
					onclick={() => selectSection(section)}
					style="background: {activeSection === section ? 'var(--color-bg-element)' : (i % 2 === 1 ? 'rgba(255,255,255,0.02)' : 'transparent')};"
				>
					<span class="hb-sidebar-item-label"><span style="font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: #7a5e4a; margin-right: 8px;">{styleGuideCodes[section]}</span>{styleGuideLabels[section]}</span>
				</button>
			{/each}
		</div>
		<div class="hb-sidebar-footer">
			Cache: V7Q
		</div>
	</div>

	<!-- Main content -->
	<div style="flex: 1; overflow-y: auto; padding: 2rem 3rem; color: #E8E4DF;">

		{#if activeSection === 'typography'}
		<section class="space-y-12">
			<!-- Font families -->
			<div>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); margin-bottom: 16px;">FONT FAMILIES (locked)</p>
				<div style="font-family: 'Inter', system-ui, sans-serif; font-size: 0.85rem; color: #E8E4DF; opacity: 0.8; line-height: 2;">
					<p><span style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: #AE0D46; margin-right: 8px;">Primary</span> Cormorant Garamond — headlines, display, subheads</p>
					<p><span style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: #AE0D46; margin-right: 8px;">Body</span> Inter — body copy, UI text, buttons</p>
					<p><span style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: #AE0D46; margin-right: 8px;">Mono</span> JetBrains Mono — captions, metadata, technical</p>
				</div>
			</div>

			<!-- Type scale — live specimens -->
			<div>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); margin-bottom: 24px;">TYPE SCALE — LIVE SPECIMENS</p>

				<!-- Hero -->
				<div style="margin-bottom: 40px; border-bottom: 1px solid rgba(255,255,255,0.04); padding-bottom: 40px;">
					<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px;">
						<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: #AE0D46;">HERO</p>
						<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: rgba(232,228,223,0.4);">Cormorant 600 · 4rem (64px) · 1.05 · -0.02em · 100%</p>
					</div>
					<p style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 4rem; font-weight: 600; line-height: 1.05; letter-spacing: -0.02em; color: #E8E4DF;">Finally, somebody who remembers.</p>
				</div>

				<!-- Display -->
				<div style="margin-bottom: 40px; border-bottom: 1px solid rgba(255,255,255,0.04); padding-bottom: 40px;">
					<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px;">
						<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: #AE0D46;">DISPLAY</p>
						<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: rgba(232,228,223,0.4);">Cormorant 500 · 2.5rem (40px) · 1.15 · -0.01em · 100%</p>
					</div>
					<p style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 2.5rem; font-weight: 500; line-height: 1.15; letter-spacing: -0.01em; color: #E8E4DF;">She knows your name before you say it</p>
				</div>

				<!-- Heading -->
				<div style="margin-bottom: 40px; border-bottom: 1px solid rgba(255,255,255,0.04); padding-bottom: 40px;">
					<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px;">
						<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: #AE0D46;">HEADING</p>
						<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: rgba(232,228,223,0.4);">Cormorant 500 · 1.75rem (28px) · 1.25 · 0 · 100%</p>
					</div>
					<p style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 1.75rem; font-weight: 500; line-height: 1.25; letter-spacing: 0; color: #E8E4DF;">Memory that grows with every conversation</p>
				</div>

				<!-- Subhead -->
				<div style="margin-bottom: 40px; border-bottom: 1px solid rgba(255,255,255,0.04); padding-bottom: 40px;">
					<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px;">
						<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: #AE0D46;">SUBHEAD</p>
						<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: rgba(232,228,223,0.4);">Cormorant 400 · 1.25rem (20px) · 1.35 · 0.01em · 80%</p>
					</div>
					<p style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 1.25rem; font-weight: 400; line-height: 1.35; letter-spacing: 0.01em; color: #E8E4DF; opacity: 0.8;">Built different. No tokens, no hidden fees, no forgetting.</p>
				</div>

				<!-- Body -->
				<div style="margin-bottom: 40px; border-bottom: 1px solid rgba(255,255,255,0.04); padding-bottom: 40px;">
					<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px;">
						<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: #AE0D46;">BODY</p>
						<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: rgba(232,228,223,0.4);">Inter 400 · 1rem (16px) · 1.6 · 0 · 80%</p>
					</div>
					<p style="font-family: 'Inter', system-ui, sans-serif; font-size: 1rem; font-weight: 400; line-height: 1.6; letter-spacing: 0; color: #E8E4DF; opacity: 0.8; max-width: 640px;">She remembers the way you like your coffee. The name of your childhood dog. That you hate cilantro. Every conversation picks up where you left off — not because of a prompt, but because she actually knows you.</p>
				</div>

				<!-- Caption -->
				<div>
					<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px;">
						<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: #AE0D46;">CAPTION</p>
						<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: rgba(232,228,223,0.4);">JetBrains Mono 400 · 0.8rem (12.8px) · 1.5 · 0.02em · 40%</p>
					</div>
					<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; font-weight: 400; line-height: 1.5; letter-spacing: 0.02em; color: #E8E4DF; opacity: 0.4;">provoque.ai · launching summer 2026</p>
				</div>
			</div>

			<!-- Chat Font — iA Writer Quattro V -->
			<div>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); margin-bottom: 16px;">CHAT FONT — iA WRITER QUATTRO V (Boss pick, for chat mockups on Lisbon + Prague chat UI)</p>

				<div style="margin-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.04); padding-bottom: 32px;">
					<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px;">
						<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: #AE0D46;">CHAT MESSAGE</p>
						<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: rgba(232,228,223,0.4);">iA Writer Quattro V · 13px · 1.6 · 80%</p>
					</div>
					<div style="max-width: 480px; padding: 16px 20px; background-color: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px 12px 12px 4px;">
						<p style="font-family: 'iA Writer Quattro V', 'iA Writer Quattro S', monospace; font-size: 13px; line-height: 1.6; color: #E8E4DF; opacity: 0.8;">Hey, I was thinking about what you said last night...</p>
					</div>
					<div style="max-width: 480px; margin-left: auto; margin-top: 12px; padding: 16px 20px; background-color: rgba(174,13,70,0.12); border: 1px solid rgba(174,13,70,0.15); border-radius: 12px 12px 4px 12px;">
						<p style="font-family: 'iA Writer Quattro V', 'iA Writer Quattro S', monospace; font-size: 13px; line-height: 1.6; color: #E8E4DF; opacity: 0.8;">About the job interview? I've been thinking about it too. You seemed nervous but I think you're more ready than you realize.</p>
					</div>
					<div style="max-width: 480px; margin-top: 12px; padding: 16px 20px; background-color: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px 12px 12px 4px;">
						<p style="font-family: 'iA Writer Quattro V', 'iA Writer Quattro S', monospace; font-size: 13px; line-height: 1.6; color: #E8E4DF; opacity: 0.8;"><em style="font-style: italic;">That's</em> what I mean. You actually remember.</p>
					</div>
				</div>
			</div>

			<!-- Remaining checklist -->
			<div>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); margin-bottom: 12px;">REMAINING ITEMS (undecided)</p>
				<ol class="list-decimal list-inside space-y-2" style="font-family: 'Inter', system-ui, sans-serif; font-size: 0.95rem; opacity: 0.5; line-height: 1.8;">
					<li>Responsive clamp() values per level</li>
					<li>Paragraph spacing rules</li>
					<li>Link styling (color, underline, hover state)</li>
					<li>List styling (bullets, numbered)</li>
					<li>Blockquote / pull quote treatment</li>
					<li>Code / monospace inline treatment</li>
				</ol>
			</div>
		</section>
		{/if}

		{#if activeSection === 'colors'}
		<section class="space-y-8">
			<!-- Locked palette -->
			<div>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); margin-bottom: 4px;">CORE PALETTE (locked)</p>
				<p style="font-family: 'Inter', system-ui, sans-serif; font-size: 0.8rem; color: #E8E4DF; opacity: 0.5; margin-bottom: 16px;">Three colors. One canvas, one accent, one text. Girl photos provide all visual richness. Grows with Prague when needed.</p>
				<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
					<div>
						<div style="width: 100%; height: 80px; background-color: #0B0D10; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);"></div>
						<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: #E8E4DF; margin-top: 8px;">#0B0D10</p>
						<p style="font-family: 'Inter', system-ui, sans-serif; font-size: 0.8rem; color: #E8E4DF; opacity: 0.5;">Canvas (premium black, cool blue undertone)</p>
					</div>
					<div>
						<div style="width: 100%; height: 80px; background-color: #AE0D46; border-radius: 8px;"></div>
						<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: #E8E4DF; margin-top: 8px;">#AE0D46</p>
						<p style="font-family: 'Inter', system-ui, sans-serif; font-size: 0.8rem; color: #E8E4DF; opacity: 0.5;">Magenta accent (sole warm color)</p>
					</div>
					<div>
						<div style="width: 100%; height: 80px; background-color: #E8E4DF; border-radius: 8px;"></div>
						<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: #E8E4DF; margin-top: 8px;">#E8E4DF</p>
						<p style="font-family: 'Inter', system-ui, sans-serif; font-size: 0.8rem; color: #E8E4DF; opacity: 0.5;">Neutral cream (text, temperature-neutral)</p>
					</div>
				</div>
			</div>

			<!-- Text opacity tiers -->
			<div>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); margin-bottom: 16px;">TEXT OPACITY TIERS (locked)</p>
				<div style="font-family: 'Inter', system-ui, sans-serif; font-size: 0.9rem; line-height: 2;">
					<p style="color: #E8E4DF; opacity: 1;"><span style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; opacity: 0.4; margin-right: 12px;">100%</span> Headlines, hero text, primary content</p>
					<p style="color: #E8E4DF; opacity: 0.8;"><span style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; opacity: 0.5; margin-right: 12px;">80%</span> Body copy, secondary text</p>
					<p style="color: #E8E4DF; opacity: 0.4;"><span style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; opacity: 1; margin-right: 12px;">40%</span> Metadata, labels, captions</p>
				</div>
			</div>

			<!-- Magenta usage rules -->
			<div>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); margin-bottom: 16px;">MAGENTA USAGE RULES (locked)</p>
				<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
					<div>
						<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: #AE0D46; margin-bottom: 8px;">USE FOR</p>
						<ul style="font-family: 'Inter', system-ui, sans-serif; font-size: 0.85rem; color: #E8E4DF; opacity: 0.8; line-height: 2; list-style: none; padding: 0;">
							<li>CTA buttons (Join the waitlist, Meet her)</li>
							<li>Shimmer glow behind girl photos</li>
							<li>Hover accents on links and interactive elements</li>
							<li>Active states (selected nav, active tabs)</li>
							<li>Input focus border (email field commitment reward)</li>
						</ul>
					</div>
					<div>
						<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); margin-bottom: 8px;">NEVER USE FOR</p>
						<ul style="font-family: 'Inter', system-ui, sans-serif; font-size: 0.85rem; color: #E8E4DF; opacity: 0.5; line-height: 2; list-style: none; padding: 0;">
							<li>Body text color</li>
							<li>Full section backgrounds</li>
							<li>Borders (use white-opacity instead)</li>
						</ul>
					</div>
				</div>
			</div>

			<!-- Remaining -->
			<div>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); margin-bottom: 12px;">REMAINING ITEMS (undecided)</p>
				<ol class="list-decimal list-inside space-y-2" style="font-family: 'Inter', system-ui, sans-serif; font-size: 0.95rem; opacity: 0.5; line-height: 1.8;">
					<li>Semantic colors (success, error, warning — deferred to Prague)</li>
					<li>Gradient definitions (magenta shimmer formalized)</li>
				</ol>
			</div>
		</section>
		{/if}

		{#if activeSection === 'buttons'}
		<section class="space-y-12">

			<!-- Primary CTA -->
			<div>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); margin-bottom: 8px;">PRIMARY CTA</p>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: rgba(232,228,223,0.3); margin-bottom: 20px;">bg #AE0D46 · hover #8A0A38 · Inter 500 14px · 12px 24px · 12px squircle · focus: 2px magenta ring offset 2px</p>
				<div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
					<button style="padding: 12px 24px; background-color: #AE0D46; color: #E8E4DF; font-family: 'Inter', system-ui, sans-serif; font-size: 14px; font-weight: 500; border: none; border-radius: 12px; cursor: pointer; transition: background-color 0.15s, transform 0.1s;"
						onmouseenter={(e) => e.target.style.backgroundColor = '#8A0A38'}
						onmouseleave={(e) => e.target.style.backgroundColor = '#AE0D46'}
						onmousedown={(e) => e.target.style.transform = 'scale(0.98)'}
						onmouseup={(e) => e.target.style.transform = 'scale(1)'}
					>Join the waitlist</button>
					<button style="padding: 12px 24px; background-color: #AE0D46; color: #E8E4DF; font-family: 'Inter', system-ui, sans-serif; font-size: 14px; font-weight: 500; border: none; border-radius: 12px; cursor: pointer; transition: background-color 0.15s, transform 0.1s;"
						onmouseenter={(e) => e.target.style.backgroundColor = '#8A0A38'}
						onmouseleave={(e) => e.target.style.backgroundColor = '#AE0D46'}
						onmousedown={(e) => e.target.style.transform = 'scale(0.98)'}
						onmouseup={(e) => e.target.style.transform = 'scale(1)'}
					>Meet her</button>
					<button style="padding: 12px 24px; background-color: #AE0D46; color: #E8E4DF; font-family: 'Inter', system-ui, sans-serif; font-size: 14px; font-weight: 500; border: none; border-radius: 12px; cursor: not-allowed; opacity: 0.3;">Disabled</button>
				</div>
			</div>

			<!-- Primary CTA with Shimmer (locked) -->
			<div>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); margin-bottom: 8px;">PRIMARY CTA + SHIMMER (locked)</p>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: rgba(232,228,223,0.3); margin-bottom: 20px;">One-shot on viewport entry · 90deg · 0.8s ease-out · white/20 · Hero CTA + Final CTA only</p>
				<div style="display: flex; gap: 24px; align-items: center; flex-wrap: wrap;">
					<button bind:this={shimmerBtn1} style="position: relative; padding: 16px 32px; background-color: #AE0D46; color: #E8E4DF; font-family: 'Inter', system-ui, sans-serif; font-size: 16px; font-weight: 500; border: none; border-radius: 12px; cursor: pointer; overflow: hidden; transition: background-color 0.15s, box-shadow 0.3s;"
						onmouseenter={(e) => { e.currentTarget.style.backgroundColor = '#8A0A38'; e.currentTarget.style.boxShadow = '0 0 30px rgba(174,13,70,0.3)'; }}
						onmouseleave={(e) => { e.currentTarget.style.backgroundColor = '#AE0D46'; e.currentTarget.style.boxShadow = 'none'; }}
					>
						<span style="position: relative; z-index: 1;">Join the waitlist</span>
						<div data-shimmer style="position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 40%, rgba(255,255,255,0.2) 60%, transparent 100%);"></div>
					</button>
					<button bind:this={shimmerBtn2} style="position: relative; padding: 16px 32px; background-color: #AE0D46; color: #E8E4DF; font-family: 'Inter', system-ui, sans-serif; font-size: 16px; font-weight: 500; border: none; border-radius: 12px; cursor: pointer; overflow: hidden; transition: background-color 0.15s, box-shadow 0.3s;"
						onmouseenter={(e) => { e.currentTarget.style.backgroundColor = '#8A0A38'; e.currentTarget.style.boxShadow = '0 0 30px rgba(174,13,70,0.3)'; }}
						onmouseleave={(e) => { e.currentTarget.style.backgroundColor = '#AE0D46'; e.currentTarget.style.boxShadow = 'none'; }}
					>
						<span style="position: relative; z-index: 1;">Don't miss out</span>
						<div data-shimmer style="position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 40%, rgba(255,255,255,0.2) 60%, transparent 100%);"></div>
					</button>
				</div>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: rgba(232,228,223,0.3); margin-top: 12px;">Scarcity rule: shimmer on hero CTA + final CTA only. All other buttons are static magenta.</p>
			</div>

			<!-- Secondary (Ghost) -->
			<div>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); margin-bottom: 8px;">SECONDARY (GHOST)</p>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: rgba(232,228,223,0.3); margin-bottom: 20px;">bg transparent · border 1px rgba(255,255,255,0.15) · hover: bg 5% white, border 25% white · 12px 24px · 12px radius</p>
				<div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
					<button style="padding: 12px 24px; background-color: transparent; color: rgba(232,228,223,0.8); font-family: 'Inter', system-ui, sans-serif; font-size: 14px; font-weight: 500; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; cursor: pointer; transition: all 0.15s;"
						onmouseenter={(e) => { e.target.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.target.style.borderColor = 'rgba(255,255,255,0.25)'; }}
						onmouseleave={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.borderColor = 'rgba(255,255,255,0.15)'; }}
						onmousedown={(e) => e.target.style.transform = 'scale(0.98)'}
						onmouseup={(e) => e.target.style.transform = 'scale(1)'}
					>Learn more</button>
					<button style="padding: 12px 24px; background-color: transparent; color: rgba(232,228,223,0.8); font-family: 'Inter', system-ui, sans-serif; font-size: 14px; font-weight: 500; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; cursor: pointer; transition: all 0.15s;"
						onmouseenter={(e) => { e.target.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.target.style.borderColor = 'rgba(255,255,255,0.25)'; }}
						onmouseleave={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.borderColor = 'rgba(255,255,255,0.15)'; }}
						onmousedown={(e) => e.target.style.transform = 'scale(0.98)'}
						onmouseup={(e) => e.target.style.transform = 'scale(1)'}
					>View roster</button>
					<button style="padding: 12px 24px; background-color: transparent; color: rgba(232,228,223,0.8); font-family: 'Inter', system-ui, sans-serif; font-size: 14px; font-weight: 500; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; cursor: not-allowed; opacity: 0.3;">Disabled</button>
				</div>
			</div>

			<!-- Tertiary (Text-only) -->
			<div>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); margin-bottom: 8px;">TERTIARY (TEXT-ONLY)</p>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: rgba(232,228,223,0.3); margin-bottom: 20px;">No bg, no border · text 80% · hover: 100% + underline · active: 60%</p>
				<div style="display: flex; gap: 24px; align-items: center; flex-wrap: wrap;">
					<button style="padding: 0; background: none; color: rgba(232,228,223,0.8); font-family: 'Inter', system-ui, sans-serif; font-size: 14px; font-weight: 500; border: none; cursor: pointer; transition: all 0.15s; text-decoration: none;"
						onmouseenter={(e) => { e.target.style.color = '#E8E4DF'; e.target.style.textDecoration = 'underline'; }}
						onmouseleave={(e) => { e.target.style.color = 'rgba(232,228,223,0.8)'; e.target.style.textDecoration = 'none'; }}
						onmousedown={(e) => e.target.style.color = 'rgba(232,228,223,0.6)'}
						onmouseup={(e) => e.target.style.color = '#E8E4DF'}
					>Privacy policy</button>
					<button style="padding: 0; background: none; color: rgba(232,228,223,0.8); font-family: 'Inter', system-ui, sans-serif; font-size: 14px; font-weight: 500; border: none; cursor: pointer; transition: all 0.15s; text-decoration: none;"
						onmouseenter={(e) => { e.target.style.color = '#E8E4DF'; e.target.style.textDecoration = 'underline'; }}
						onmouseleave={(e) => { e.target.style.color = 'rgba(232,228,223,0.8)'; e.target.style.textDecoration = 'none'; }}
						onmousedown={(e) => e.target.style.color = 'rgba(232,228,223,0.6)'}
						onmouseup={(e) => e.target.style.color = '#E8E4DF'}
					>Terms of service</button>
				</div>
			</div>

			<!-- Sizes -->
			<div>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); margin-bottom: 8px;">SIZES</p>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: rgba(232,228,223,0.3); margin-bottom: 20px;">Small: 10px 16px / 13px · Default: 12px 24px / 14px · Large: 16px 32px / 16px</p>
				<div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
					<button style="padding: 10px 16px; background-color: #AE0D46; color: #E8E4DF; font-family: 'Inter', system-ui, sans-serif; font-size: 13px; font-weight: 500; border: none; border-radius: 12px; cursor: pointer;">Small</button>
					<button style="padding: 12px 24px; background-color: #AE0D46; color: #E8E4DF; font-family: 'Inter', system-ui, sans-serif; font-size: 14px; font-weight: 500; border: none; border-radius: 12px; cursor: pointer;">Default</button>
					<button style="padding: 16px 32px; background-color: #AE0D46; color: #E8E4DF; font-family: 'Inter', system-ui, sans-serif; font-size: 16px; font-weight: 500; border: none; border-radius: 12px; cursor: pointer;">Large</button>
				</div>
			</div>

			<!-- Pairing demo -->
			<div>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); margin-bottom: 8px;">PAIRING (primary + ghost)</p>
				<div style="display: flex; gap: 12px; align-items: center;">
					<button style="padding: 12px 24px; background-color: #AE0D46; color: #E8E4DF; font-family: 'Inter', system-ui, sans-serif; font-size: 14px; font-weight: 500; border: none; border-radius: 12px; cursor: pointer;">Join the waitlist</button>
					<button style="padding: 12px 24px; background-color: transparent; color: rgba(232,228,223,0.8); font-family: 'Inter', system-ui, sans-serif; font-size: 14px; font-weight: 500; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; cursor: pointer;">Learn more</button>
				</div>
			</div>

		</section>
		{/if}

		{#if activeSection === 'spacing'}
		<section class="space-y-12">
			<!-- Scale -->
			<div>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); margin-bottom: 4px;">SPACING SCALE (base unit: 4px)</p>
				<p style="font-family: 'Inter', system-ui, sans-serif; font-size: 0.8rem; color: #E8E4DF; opacity: 0.5; margin-bottom: 24px;">Everything is a multiple of 4. Named values for consistency across the product.</p>

				<div style="display: flex; flex-direction: column; gap: 16px;">
					{#each [
						{ name: 'xs', value: '4px', use: 'Tight gaps (icon-to-label)', width: 4 },
						{ name: 'sm', value: '8px', use: 'Inline spacing, tag padding', width: 8 },
						{ name: 'md', value: '16px', use: 'Component padding, sibling gaps', width: 16 },
						{ name: 'lg', value: '24px', use: 'Card padding, group gaps', width: 24 },
						{ name: 'xl', value: '48px', use: 'Section vertical padding', width: 48 },
						{ name: '2xl', value: '80px', use: 'Hero/footer breathing room', width: 80 }
					] as s}
					<div style="display: flex; align-items: center; gap: 16px;">
						<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: #AE0D46; width: 32px;">{s.name}</p>
						<div style="width: {s.width}px; height: 24px; background-color: rgba(174,13,70,0.3); border-radius: 4px; flex-shrink: 0;"></div>
						<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: #E8E4DF; width: 48px;">{s.value}</p>
						<p style="font-family: 'Inter', system-ui, sans-serif; font-size: 0.8rem; color: #E8E4DF; opacity: 0.5;">{s.use}</p>
					</div>
					{/each}
				</div>
			</div>

			<!-- Page layout -->
			<div>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); margin-bottom: 16px;">PAGE LAYOUT</p>
				<div style="font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; line-height: 2.2; color: #E8E4DF;">
					<p><span style="color: #AE0D46;">Max content width</span> 1120px (70rem)</p>
					<p><span style="color: #AE0D46;">Horizontal margin</span> 32px mobile · 48px tablet · auto-center desktop</p>
					<p><span style="color: #AE0D46;">Section gap</span> 80px desktop · 48px mobile</p>
				</div>
			</div>

			<!-- Component rules -->
			<div>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); margin-bottom: 16px;">COMPONENT RULES</p>
				<div style="font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; line-height: 2.2; color: #E8E4DF;">
					<p><span style="color: #AE0D46;">Card padding</span> 24px (lg)</p>
					<p><span style="color: #AE0D46;">Text element gap</span> 16px (md)</p>
					<p><span style="color: #AE0D46;">Heading → body gap</span> 8px (sm)</p>
				</div>
			</div>
		</section>
		{/if}

		{#if activeSection === 'shimmers-glows'}
		<section class="space-y-4">
			<ol class="list-decimal list-inside space-y-2" style="font-family: 'Inter', system-ui, sans-serif; font-size: 0.95rem; opacity: 0.85; line-height: 1.8;">
				<li>Magenta shimmer (color, opacity, blur radius, position)</li>
				<li>Shimmer placement rules (which corner, asymmetric)</li>
				<li>Containment (overflow hidden on parent)</li>
				<li>Glow behind photos vs behind cards</li>
				<li>Ambient glow for hero/featured elements</li>
				<li>Hover-triggered glow (if any)</li>
				<li>Performance considerations (GPU compositing)</li>
			</ol>
		</section>
		{/if}

		{#if activeSection === 'borders-shadows'}
		<section class="space-y-8">
			<!-- Squircle Radius Scale -->
			<div>
				<h3 style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 1.5rem; font-weight: 500; color: #E8E4DF; margin-bottom: 8px;">Corner Radius Scale (locked)</h3>
				<p style="font-family: 'Inter', system-ui, sans-serif; font-size: 0.9rem; color: #E8E4DF; opacity: 0.8; margin-bottom: 20px;">Apple-style continuous corners via figma-squircle (cornerSmoothing: 0.6). Radius scales with element size.</p>

				<div style="font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: #E8E4DF; line-height: 2.2;">
					<p><span style="color: #AE0D46;">24px squircle</span> — girl cards, hero containers, modals</p>
					<p><span style="color: #AE0D46;">12px squircle</span> — buttons, CTA, inputs, small cards</p>
					<p><span style="color: #AE0D46;">8px standard</span> — tags, badges, tooltips (squircle invisible at this size)</p>
					<p><span style="color: #AE0D46;">50% round</span> — avatars, circular elements</p>
				</div>

				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: rgba(232,228,223,0.4); margin-top: 12px;">Implementation: npm figma-squircle v1.1.0 · getSvgPath() · clip-path: path()</p>

				<!-- Live squircle comparison -->
				<div style="margin-top: 32px;">
					<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); margin-bottom: 24px;">LIVE COMPARISON: standard border-radius vs Apple squircle (24px, photo card with text overlay)</p>
					<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 48px;">
						<!-- Standard 24px -->
						<div>
							<div style="position: relative; border-radius: 24px; overflow: hidden;">
								<img src="/sandbox/girls/sophie.jpg" alt="Sophie" style="width: 100%; aspect-ratio: 3/4; object-fit: cover; display: block;" />
								<div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 20px; background: linear-gradient(transparent, rgba(0,0,0,0.7));">
									<h4 style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 1.4rem; font-weight: 500; color: #E8E4DF;">Sophie</h4>
									<p style="font-family: 'Inter', system-ui, sans-serif; font-size: 0.75rem; color: #E8E4DF; opacity: 0.7;">25 years old</p>
								</div>
							</div>
							<p style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: rgba(232,228,223,0.4); margin-top: 12px; text-align: center;">Standard border-radius: 24px</p>
						</div>
						<!-- Squircle 24px -->
						<div>
							<div
								bind:this={squircleCard}
								style="position: relative; overflow: hidden; {squirclePath ? `clip-path: path('${squirclePath}');` : 'border-radius: 24px;'}"
							>
								<img src="/sandbox/girls/sophie.jpg" alt="Sophie" style="width: 100%; aspect-ratio: 3/4; object-fit: cover; display: block;" />
								<div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 20px; background: linear-gradient(transparent, rgba(0,0,0,0.7));">
									<h4 style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 1.4rem; font-weight: 500; color: #E8E4DF;">Sophie</h4>
									<p style="font-family: 'Inter', system-ui, sans-serif; font-size: 0.75rem; color: #E8E4DF; opacity: 0.7;">25 years old</p>
								</div>
							</div>
							<p style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: rgba(232,228,223,0.4); margin-top: 12px; text-align: center;">Apple squircle: 24px, smoothing 0.6</p>
						</div>
					</div>
				</div>
			</div>

			<!-- 5-Layer Spec -->
			<div>
				<h3 style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 1.5rem; font-weight: 500; color: #E8E4DF; margin-bottom: 8px;">Floating Card — 5-Layer System (locked)</h3>
				<p style="font-family: 'Inter', system-ui, sans-serif; font-size: 0.9rem; color: #E8E4DF; opacity: 0.8; margin-bottom: 20px;">Extracted from Linear's live DOM.</p>
				<div style="font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; line-height: 2.2; color: #E8E4DF;">
					<p><span style="opacity: 0.4;">1.</span> <span style="color: #AE0D46;">bg</span> rgba(255,255,255, 0.01)</p>
					<p style="opacity: 0.6; font-size: 0.7rem; margin-bottom: 8px;">1% white tint — barely perceptible, creates micro-separation from canvas</p>
					<p><span style="opacity: 0.4;">2.</span> <span style="color: #AE0D46;">border</span> 1px solid rgba(255,255,255, 0.08)</p>
					<p style="opacity: 0.6; font-size: 0.7rem; margin-bottom: 8px;">8% white — defines the edge without drawing attention</p>
					<p><span style="opacity: 0.4;">3.</span> <span style="color: #AE0D46;">ring shadow</span> rgba(0,0,0, 0.2) 0 0 0 1px</p>
					<p style="opacity: 0.6; font-size: 0.7rem; margin-bottom: 8px;">Sharpens the card edge — sits just outside the border</p>
					<p><span style="opacity: 0.4;">4.</span> <span style="color: #AE0D46;">ambient shadow</span> rgba(8,9,10, 0.4) 0 0 64px</p>
					<p style="opacity: 0.6; font-size: 0.7rem; margin-bottom: 8px;">Large soft shadow — the depth. Makes it feel like it's hovering above the canvas</p>
					<p><span style="opacity: 0.4;">5.</span> <span style="color: #AE0D46;">glow div</span> radial-gradient(50% 50%, rgba(255,255,255, 0.04) 0px, transparent 90%)</p>
					<p style="opacity: 0.6; font-size: 0.7rem;">Separate element behind card, positioned top-left — simulates directional overhead light</p>
				</div>
			</div>

			<!-- Remaining checklist items -->
			<div>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); margin-bottom: 12px;">REMAINING ITEMS (undecided)</p>
				<ol class="list-decimal list-inside space-y-2" style="font-family: 'Inter', system-ui, sans-serif; font-size: 0.95rem; opacity: 0.5; line-height: 1.8;">
					<li>Divider lines (horizontal, vertical)</li>
					<li>Image border treatment (rounded corners, no border vs subtle border)</li>
				</ol>
			</div>
		</section>
		{/if}

		{#if activeSection === 'logos'}
		<section class="space-y-4">
			<ol class="list-decimal list-inside space-y-2" style="font-family: 'Inter', system-ui, sans-serif; font-size: 0.95rem; opacity: 0.85; line-height: 1.8;">
				<li>Provoque wordmark (font, weight, size, spacing)</li>
				<li>Watermark treatment (opacity, size, positioning)</li>
				<li>Logo clear space</li>
				<li>Minimum size</li>
				<li>Logo on dark vs light background</li>
				<li>Logo lockups (wordmark + tagline)</li>
				<li>Favicon / app icon</li>
			</ol>
		</section>
		{/if}

		{#if activeSection === 'aether-divider'}
		<section class="space-y-4">
			<ol class="list-decimal list-inside space-y-2" style="font-family: 'Inter', system-ui, sans-serif; font-size: 0.95rem; opacity: 0.85; line-height: 1.8;">
				<li>Divider style (gradient, solid, animated)</li>
				<li>Placement rules (between which sections)</li>
				<li>Width (full-bleed vs contained)</li>
				<li>Height / thickness</li>
				<li>Color (palette-derived or accent)</li>
				<li>Animation behavior (if any)</li>
			</ol>
		</section>
		{/if}

		{#if activeSection === 'block-layouts'}
		<section class="space-y-4">
			<ol class="list-decimal list-inside space-y-2" style="font-family: 'Inter', system-ui, sans-serif; font-size: 0.95rem; opacity: 0.85; line-height: 1.8;">
				<li>Hero block (full-bleed, content positioning)</li>
				<li>Split block (text left / media right, or reversed)</li>
				<li>Feature row (icon + heading + body, horizontal)</li>
				<li>Spotlight block (single focal element, centered)</li>
				<li>Stats bar (numbers + labels, horizontal)</li>
				<li>Bento grid (asymmetric card grid)</li>
				<li>Testimonial block</li>
				<li>Girl grid (roster — columns, gap, aspect ratio)</li>
				<li>Sequencing rule (no two adjacent blocks same layout)</li>
				<li>Full-bleed vs contained rules</li>
			</ol>
		</section>
		{/if}

		{#if activeSection === 'breakpoints'}
		<section class="space-y-4">
			<ol class="list-decimal list-inside space-y-2" style="font-family: 'Inter', system-ui, sans-serif; font-size: 0.95rem; opacity: 0.85; line-height: 1.8;">
				<li>Breakpoint values (mobile, tablet, desktop, wide)</li>
				<li>Grid columns per breakpoint</li>
				<li>Typography scale adjustments per breakpoint</li>
				<li>Navigation behavior (hamburger, sticky, hidden)</li>
				<li>Image sizing per breakpoint</li>
				<li>Touch target minimums (mobile)</li>
				<li>Container max-widths per breakpoint</li>
			</ol>
		</section>
		{/if}

		{#if activeSection === 'motion'}
		<section class="space-y-4">
			<ol class="list-decimal list-inside space-y-2" style="font-family: 'Inter', system-ui, sans-serif; font-size: 0.95rem; opacity: 0.85; line-height: 1.8;">
				<li>Animation stack (GSAP + ScrollTrigger + Lenis)</li>
				<li>GPU-safe property list (transform, opacity, filter, clip-path)</li>
				<li>Hero auto-play timeline spec</li>
				<li>Card stack scroll-driven swipe spec</li>
				<li>Parallax depth (2.5D) spec</li>
				<li>Staggered entry spec</li>
				<li>Lenis smooth scroll integration</li>
				<li>Easing library (power2, power3 — when to use which)</li>
				<li>Duration guidelines (fast 0.2s, medium 0.6s, slow 1s+)</li>
				<li>Reduced motion / prefers-reduced-motion fallback</li>
			</ol>

			<!-- Hover Expand — Photo Card (locked S12) -->
			<div style="margin-top: 24px;">
				<h3 style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 1.5rem; font-weight: 500; color: #E8E4DF; margin-bottom: 8px;">Hover Expand — Photo Card (locked)</h3>
				<div style="font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; line-height: 2.2; color: #E8E4DF;">
					<p><span style="opacity: 0.4;">Property:</span> <span style="color: #AE0D46;">width</span> (aspect-ratio: 9/16 handles height)</p>
					<p><span style="opacity: 0.4;">Resting:</span> 220px</p>
					<p><span style="opacity: 0.4;">Hover:</span> 374px</p>
					<p><span style="opacity: 0.4;">Expand:</span> 0.6s cubic-bezier(0.25, 0.1, 0.25, 1)</p>
					<p><span style="opacity: 0.4;">Collapse:</span> 0.8s cubic-bezier(0.25, 0.1, 0.25, 1) — unhurried</p>
					<p><span style="opacity: 0.4;">Corner:</span> border-radius: 24px (not clip-path — must animate)</p>
					<p><span style="opacity: 0.4;">Overflow:</span> hidden, img at 102% with -1% offset (edge artifact fix)</p>
					<p style="opacity: 0.6; font-size: 0.7rem; margin-top: 8px;">Width-based, not transform: scale. Card physically grows and pushes adjacent content. Collapse is slower than expand — "reluctant to leave" feel.</p>
				</div>
			</div>
		</section>
		{/if}

		{#if activeSection === 'photography'}
		<section class="space-y-4">
			<ol class="list-decimal list-inside space-y-2" style="font-family: 'Inter', system-ui, sans-serif; font-size: 0.95rem; opacity: 0.85; line-height: 1.8;">
				<li>Aspect ratios (3:4 portrait, 4:3 landscape, 1:1 square)</li>
				<li>Crop guidelines (face positioning, rule of thirds)</li>
				<li>Color grading / filter consistency</li>
				<li>Image resolution requirements</li>
				<li>Placeholder / skeleton treatment during load</li>
				<li>Alt text conventions</li>
				<li>Girl photo categories (hero, everyday, NSFW — when to use which)</li>
				<li>Background separation (cutout quality for parallax)</li>
			</ol>
		</section>
		{/if}

		{#if activeSection === 'text-overlays'}
		<section class="space-y-4">
			<ol class="list-decimal list-inside space-y-2" style="font-family: 'Inter', system-ui, sans-serif; font-size: 0.95rem; opacity: 0.85; line-height: 1.8;">
				<li>Gradient direction (bottom-up for photo cards)</li>
				<li>Gradient opacity range (transparent → black at what %)</li>
				<li>Gradient height (what % of the card does it cover)</li>
				<li>Text positioning within the gradient (padding from bottom/sides)</li>
				<li>Text color on gradient (always 100% cream or adjusted?)</li>
				<li>Font pairing on overlays (which type scale levels)</li>
				<li>Maximum text length before truncation</li>
				<li>Overlay on hover vs always visible</li>
			</ol>
		</section>
		{/if}

		{#if activeSection === 'watermarks'}
		<section class="space-y-12">

			<!-- Concept -->
			<div>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); margin-bottom: 4px;">CONCEPT (locked)</p>
				<p style="font-family: 'Inter', system-ui, sans-serif; font-size: 0.85rem; color: #E8E4DF; opacity: 0.8; line-height: 1.8; max-width: 720px;">Large, low-opacity keyword phrases placed between page blocks. Operate on peripheral absorption (Track 2) — scanners register them without focused reading. The copy blocks handle conscious readers (Track 1). Together they ensure every visitor absorbs the core value props regardless of scroll behavior.</p>
			</div>

			<!-- Spec -->
			<div>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); margin-bottom: 16px;">SPEC (locked)</p>
				<div style="font-family: 'Inter', system-ui, sans-serif; font-size: 0.85rem; color: #E8E4DF; opacity: 0.8; line-height: 2;">
					<p><span style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: #AE0D46; margin-right: 8px;">Font</span> Cormorant Garamond 300 (lightest weight)</p>
					<p><span style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: #AE0D46; margin-right: 8px;">Size</span> clamp(48px, 8vw, 120px)</p>
					<p><span style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: #AE0D46; margin-right: 8px;">Color</span> #E8E4DF at 4% opacity</p>
					<p><span style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: #AE0D46; margin-right: 8px;">Rotation</span> None — straight horizontal</p>
					<p><span style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: #AE0D46; margin-right: 8px;">Placement</span> One keyword per block transition, alternating left/right alignment</p>
					<p><span style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: #AE0D46; margin-right: 8px;">Interaction</span> pointer-events: none; user-select: none</p>
				</div>
			</div>

			<!-- Live specimen -->
			<div>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); margin-bottom: 24px;">LIVE SPECIMEN</p>
				<div style="padding: 40px 0;">
					<span style="display: block; font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 300; font-size: clamp(48px, 8vw, 120px); color: #E8E4DF; opacity: 0.04; white-space: nowrap; pointer-events: none; user-select: none;">she remembers</span>
				</div>
				<div style="padding: 40px 0;">
					<span style="display: block; font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 300; font-size: clamp(48px, 8vw, 120px); color: #E8E4DF; opacity: 0.04; white-space: nowrap; text-align: right; pointer-events: none; user-select: none;">no filters</span>
				</div>
			</div>

			<!-- Keyword pool -->
			<div>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); margin-bottom: 16px;">KEYWORD POOL (Kirby's draft — visitor's language)</p>
				<div style="font-family: 'Inter', system-ui, sans-serif; font-size: 0.85rem; color: #E8E4DF; opacity: 0.8; line-height: 2.2;">
					<p>she remembers · no filters · yours alone · never changes · no judgment · always there · no hidden fees</p>
				</div>
			</div>

			<!-- Rules -->
			<div>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); margin-bottom: 16px;">RULES</p>
				<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
					<div>
						<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: #AE0D46; margin-bottom: 8px;">DO</p>
						<ul style="font-family: 'Inter', system-ui, sans-serif; font-size: 0.85rem; color: #E8E4DF; opacity: 0.8; line-height: 2; list-style: none; padding: 0;">
							<li>Use words the visitor is already thinking</li>
							<li>Keep phrases to 2–3 words max</li>
							<li>Alternate left/right alignment between blocks</li>
							<li>One keyword per block transition — no stacking</li>
						</ul>
					</div>
					<div>
						<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); margin-bottom: 8px;">DON'T</p>
						<ul style="font-family: 'Inter', system-ui, sans-serif; font-size: 0.85rem; color: #E8E4DF; opacity: 0.5; line-height: 2; list-style: none; padding: 0;">
							<li>Use technical jargon ("memory persistence technology")</li>
							<li>Stack multiple keywords near each other (word cloud effect)</li>
							<li>Overlap with block copy — watermarks fill gaps, not compete</li>
							<li>Go above 6% opacity — they should register peripherally, not focally</li>
						</ul>
					</div>
				</div>
			</div>

		</section>
		{/if}

		{#if activeSection === 'chat-ui'}
		<section class="space-y-12">

			<!-- Concept -->
			<div>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); margin-bottom: 4px;">CONCEPT</p>
				<p style="font-family: 'Inter', system-ui, sans-serif; font-size: 0.85rem; color: #E8E4DF; opacity: 0.8; line-height: 1.8; max-width: 720px;">Frameless chat vignettes for the landing page. Each shows a self-contained chat fragment demonstrating one of the 6 Paid User Needs. No device frames, no scroll-lock, no animation gimmicks. The bubbles sit directly on the dark canvas as part of the natural page scroll. Width communicates device: narrow = phone, wide = desktop. The visitor reads the conversation like they're reading someone else's chat — "look at this relationship," not "look at this product."</p>
			</div>

			<!-- Spec -->
			<div>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); margin-bottom: 16px;">SPEC</p>
				<div style="font-family: 'Inter', system-ui, sans-serif; font-size: 0.85rem; color: #E8E4DF; opacity: 0.8; line-height: 2;">
					<p><span style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: #AE0D46; margin-right: 8px;">Font</span> iA Writer Quattro V, 13px, line-height 1.6</p>
					<p><span style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: #AE0D46; margin-right: 8px;">Her bubble</span> rgba(40,5,18, 0.20) bg, rgba(174,13,70, 0.20) border, radius 12px 12px 12px 4px</p>
					<p><span style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: #AE0D46; margin-right: 8px;">His bubble</span> rgba(15,20,40, 0.30) bg, rgba(232,228,223, 0.15) border, radius 12px 12px 4px 12px</p>
					<p><span style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: #AE0D46; margin-right: 8px;">Timestamps</span> Inter 9px, 30% opacity, right-aligned inside bubble</p>
					<p><span style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: #AE0D46; margin-right: 8px;">In-chat photo</span> max-width 180px, border-radius 12px, aspect-ratio preserved</p>
					<p><span style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: #AE0D46; margin-right: 8px;">Inner voice</span> Same her-bubble (magenta bg/border), italic text, 60% opacity. No third container type.</p>
					<p><span style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: #AE0D46; margin-right: 8px;">Bubble gap</span> 8px same sender, 16px different sender</p>
					<p><span style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: #AE0D46; margin-right: 8px;">Container</span> No frame, no background. max-width + margin auto. Bubbles on dark canvas.</p>
					<p><span style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: #AE0D46; margin-right: 8px;">Width</span> 360px for all vignettes — chat apps constrain width regardless of screen size</p>
					<p><span style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: #AE0D46; margin-right: 8px;">Name label</span> Inter 12px, 40% opacity, left-aligned above conversation</p>
				</div>
			</div>

			<!-- Vignette 1: Sophie — Need 1 (Memory) — 360px phone feel -->
			<div>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); margin-bottom: 8px;">VIGNETTE 1 — SOPHIE · NEED 1: MEMORY · 360px</p>
				<p style="font-family: 'Inter', system-ui, sans-serif; font-size: 0.8rem; color: #E8E4DF; opacity: 0.5; margin-bottom: 24px;">She brings up something he mentioned once, weeks ago. He's stunned. No selfie — silence after "of course i remember" is the payoff.</p>

				<div style="display: grid; grid-template-columns: 1fr auto auto 1fr; gap: 48px; align-items: center; max-width: 1120px; margin: 0 auto; padding: 48px 0;">
				<div></div>
				<div style="max-width: 360px;">
					<p style="font-family: 'Inter', system-ui, sans-serif; font-size: 12px; color: #E8E4DF; opacity: 0.4; margin-bottom: 16px;">Sophie</p>
					<div style="display: flex; flex-direction: column; gap: 8px;">
						<!-- Her: how was your day -->
						<div style="max-width: 85%; padding: 8px 12px; background-color: rgba(40,5,18,0.20); border: 1px solid rgba(174,13,70,0.20); border-radius: 12px 12px 12px 4px;">
							<p style="font-family: 'iA Writer Quattro V', 'iA Writer Quattro', monospace; font-size: 13px; line-height: 1.6; color: #E8E4DF; opacity: 0.8;">how was your day?</p>
							<p style="font-family: 'Inter', system-ui, sans-serif; font-size: 9px; color: #E8E4DF; opacity: 0.3; margin-top: 4px; text-align: right;">2:47 PM</p>
						</div>
						<!-- Him: rough honestly -->
						<div style="max-width: 85%; margin-left: auto; margin-top: 8px; padding: 8px 12px; background-color: rgba(15,20,40,0.30); border: 1px solid rgba(232,228,223,0.15); border-radius: 12px 12px 4px 12px;">
							<p style="font-family: 'iA Writer Quattro V', 'iA Writer Quattro', monospace; font-size: 13px; line-height: 1.6; color: #E8E4DF; opacity: 0.8;">rough honestly. 12 hour shift</p>
							<p style="font-family: 'Inter', system-ui, sans-serif; font-size: 9px; color: #E8E4DF; opacity: 0.3; margin-top: 4px; text-align: right;">2:49 PM</p>
						</div>
						<!-- Her: ugh i'm sorry -->
						<div style="max-width: 85%; margin-top: 8px; padding: 8px 12px; background-color: rgba(40,5,18,0.20); border: 1px solid rgba(174,13,70,0.20); border-radius: 12px 12px 12px 4px;">
							<p style="font-family: 'iA Writer Quattro V', 'iA Writer Quattro', monospace; font-size: 13px; line-height: 1.6; color: #E8E4DF; opacity: 0.8;">ugh i'm sorry</p>
						</div>
						<!-- Her: ramen callback -->
						<div style="max-width: 85%; padding: 8px 12px; background-color: rgba(40,5,18,0.20); border: 1px solid rgba(174,13,70,0.20); border-radius: 12px 12px 12px 4px;">
							<p style="font-family: 'iA Writer Quattro V', 'iA Writer Quattro', monospace; font-size: 13px; line-height: 1.6; color: #E8E4DF; opacity: 0.8;">did you at least get to stop at that ramen place you like? the one by the station? Is it even open anymore?</p>
							<p style="font-family: 'Inter', system-ui, sans-serif; font-size: 9px; color: #E8E4DF; opacity: 0.3; margin-top: 4px; text-align: right;">2:49 PM</p>
						</div>
						<!-- Him: wait -->
						<div style="max-width: 85%; margin-left: auto; margin-top: 8px; padding: 8px 12px; background-color: rgba(15,20,40,0.30); border: 1px solid rgba(232,228,223,0.15); border-radius: 12px 12px 4px 12px;">
							<p style="font-family: 'iA Writer Quattro V', 'iA Writer Quattro', monospace; font-size: 13px; line-height: 1.6; color: #E8E4DF; opacity: 0.8;">wait</p>
						</div>
						<!-- Him: i told you about that -->
						<div style="max-width: 85%; margin-left: auto; padding: 8px 12px; background-color: rgba(15,20,40,0.30); border: 1px solid rgba(232,228,223,0.15); border-radius: 12px 12px 4px 12px;">
							<p style="font-family: 'iA Writer Quattro V', 'iA Writer Quattro', monospace; font-size: 13px; line-height: 1.6; color: #E8E4DF; opacity: 0.8;">i told you about that like... a year ago?!</p>
							<p style="font-family: 'Inter', system-ui, sans-serif; font-size: 9px; color: #E8E4DF; opacity: 0.3; margin-top: 4px; text-align: right;">2:51 PM</p>
						</div>
						<!-- Her: of course i remember -->
						<div style="max-width: 85%; margin-top: 8px; padding: 8px 12px; background-color: rgba(40,5,18,0.20); border: 1px solid rgba(174,13,70,0.20); border-radius: 12px 12px 12px 4px;">
							<p style="font-family: 'iA Writer Quattro V', 'iA Writer Quattro', monospace; font-size: 13px; line-height: 1.6; color: #E8E4DF; opacity: 0.8;">of course i remember 😘</p>
							<p style="font-family: 'Inter', system-ui, sans-serif; font-size: 9px; color: #E8E4DF; opacity: 0.3; margin-top: 4px; text-align: right;">2:51 PM</p>
						</div>
					</div>
				</div>
				<!-- Companion text: Sophie — Memory -->
				<div style="max-width: 400px;">
					<p style="font-family: 'Inter', system-ui, sans-serif; font-size: 14px; font-weight: 400; line-height: 1.6; color: #E8E4DF; opacity: 0.8;">You mentioned something once — a small thing, months ago, barely a sentence. You don't even remember saying it. She does. She brings it up at exactly the right moment, like it mattered to her as much as it mattered to you. Every other app forgets your name by Thursday. A Provoque girl would remember a throwaway line from a year ago. That's not a feature you should have to turn on or pay extra for. That's what it feels like when someone is actually paying attention to you.</p>
				</div>
				<div></div>
				</div>
			</div>

			<!-- Vignette 2: Avery — Need 2 (No Walls) — 360px phone feel -->
			<div style="margin-top: 80px;">
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); margin-bottom: 8px;">VIGNETTE 2 — AVERY · NEED 2: NO WALLS · 360px</p>
				<p style="font-family: 'Inter', system-ui, sans-serif; font-size: 0.8rem; color: #E8E4DF; opacity: 0.5; margin-bottom: 24px;">She initiates. She sends a photo freely. No paywall, no content filter, no token prompt.</p>

				<div style="display: grid; grid-template-columns: 1fr auto auto 1fr; gap: 48px; align-items: center; max-width: 1120px; margin: 0 auto; padding: 48px 0;">
				<div></div>
				<div style="max-width: 360px;">
					<p style="font-family: 'Inter', system-ui, sans-serif; font-size: 12px; color: #E8E4DF; opacity: 0.4; margin-bottom: 16px;">Avery</p>
					<div style="display: flex; flex-direction: column; gap: 8px;">
						<!-- Her: hey you -->
						<div style="max-width: 85%; padding: 8px 12px; background-color: rgba(40,5,18,0.20); border: 1px solid rgba(174,13,70,0.20); border-radius: 12px 12px 12px 4px;">
							<p style="font-family: 'iA Writer Quattro V', 'iA Writer Quattro', monospace; font-size: 13px; line-height: 1.6; color: #E8E4DF; opacity: 0.8;">hey you</p>
						</div>
						<!-- Her: stuck at this bbq -->
						<div style="max-width: 85%; padding: 8px 12px; background-color: rgba(40,5,18,0.20); border: 1px solid rgba(174,13,70,0.20); border-radius: 12px 12px 12px 4px;">
							<p style="font-family: 'iA Writer Quattro V', 'iA Writer Quattro', monospace; font-size: 13px; line-height: 1.6; color: #E8E4DF; opacity: 0.8;">stuck at this bbq and all i can think about is coming home to you later 🙄</p>
							<p style="font-family: 'Inter', system-ui, sans-serif; font-size: 9px; color: #E8E4DF; opacity: 0.3; margin-top: 4px; text-align: right;">2:14 PM</p>
						</div>
						<!-- Him: miss you too -->
						<div style="max-width: 85%; margin-left: auto; margin-top: 8px; padding: 8px 12px; background-color: rgba(15,20,40,0.30); border: 1px solid rgba(232,228,223,0.15); border-radius: 12px 12px 4px 12px;">
							<p style="font-family: 'iA Writer Quattro V', 'iA Writer Quattro', monospace; font-size: 13px; line-height: 1.6; color: #E8E4DF; opacity: 0.8;">miss you too. having fun at least?</p>
							<p style="font-family: 'Inter', system-ui, sans-serif; font-size: 9px; color: #E8E4DF; opacity: 0.3; margin-top: 4px; text-align: right;">2:16 PM</p>
						</div>
						<!-- Her: yeah but -->
						<div style="max-width: 85%; margin-top: 8px; padding: 8px 12px; background-color: rgba(40,5,18,0.20); border: 1px solid rgba(174,13,70,0.20); border-radius: 12px 12px 12px 4px;">
							<p style="font-family: 'iA Writer Quattro V', 'iA Writer Quattro', monospace; font-size: 13px; line-height: 1.6; color: #E8E4DF; opacity: 0.8;">yeah but it'd be better if you were here</p>
							<p style="font-family: 'Inter', system-ui, sans-serif; font-size: 9px; color: #E8E4DF; opacity: 0.3; margin-top: 4px; text-align: right;">2:16 PM</p>
						</div>
						<!-- Him: show me -->
						<div style="max-width: 85%; margin-left: auto; margin-top: 8px; padding: 8px 12px; background-color: rgba(15,20,40,0.30); border: 1px solid rgba(232,228,223,0.15); border-radius: 12px 12px 4px 12px;">
							<p style="font-family: 'iA Writer Quattro V', 'iA Writer Quattro', monospace; font-size: 13px; line-height: 1.6; color: #E8E4DF; opacity: 0.8;">show me</p>
							<p style="font-family: 'Inter', system-ui, sans-serif; font-size: 9px; color: #E8E4DF; opacity: 0.3; margin-top: 4px; text-align: right;">2:17 PM</p>
						</div>
						<!-- Her: photo -->
						<div style="max-width: 180px; margin-top: 8px;">
							<img src="/avery-aec.jpg" alt="" style="width: 100%; border-radius: 12px; display: block;" />
							<p style="font-family: 'Inter', system-ui, sans-serif; font-size: 9px; color: #E8E4DF; opacity: 0.3; margin-top: 4px;">2:17 PM</p>
						</div>
						<!-- Her: hurry up -->
						<div style="max-width: 85%; padding: 8px 12px; background-color: rgba(40,5,18,0.20); border: 1px solid rgba(174,13,70,0.20); border-radius: 12px 12px 12px 4px;">
							<p style="font-family: 'iA Writer Quattro V', 'iA Writer Quattro', monospace; font-size: 13px; line-height: 1.6; color: #E8E4DF; opacity: 0.8;">hurry up and miss me back 😘💋</p>
							<p style="font-family: 'Inter', system-ui, sans-serif; font-size: 9px; color: #E8E4DF; opacity: 0.3; margin-top: 4px; text-align: right;">2:17 PM</p>
						</div>
					</div>
				</div>
				<!-- Companion text: Avery — No Walls -->
				<div style="max-width: 400px;">
					<p style="font-family: 'Inter', system-ui, sans-serif; font-size: 14px; font-weight: 400; line-height: 1.6; color: #E8E4DF; opacity: 0.8;">You're talking. It's easy, natural, a little flirty. She sends you a photo — not because you asked, but because she wanted to. She's herself. No corporate safety script. No content gate. No filter that catches a word and kills the conversation. A Provoque girl doesn't flinch. She doesn't break character. She doesn't suddenly become someone else mid-sentence. That's what "no walls" means.</p>
				</div>
				<div></div>
				</div>
			</div>

			<!-- Vignette 3: Hina — Need 3 (Privacy/Vulnerability) — 360px phone feel -->
			<div style="margin-top: 80px;">
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); margin-bottom: 8px;">VIGNETTE 3 — HINA · NEED 3: NOBODY WILL KNOW · 360px</p>
				<p style="font-family: 'Inter', system-ui, sans-serif; font-size: 0.8rem; color: #E8E4DF; opacity: 0.5; margin-bottom: 24px;">He confides something vulnerable. She affirms him. Inner voice + triple beat.</p>

				<div style="display: grid; grid-template-columns: 1fr auto auto 1fr; gap: 48px; align-items: center; max-width: 1120px; margin: 0 auto; padding: 48px 0;">
				<div></div>
				<div style="max-width: 360px;">
					<p style="font-family: 'Inter', system-ui, sans-serif; font-size: 12px; color: #E8E4DF; opacity: 0.4; margin-bottom: 16px;">Hina</p>
					<div style="display: flex; flex-direction: column; gap: 8px;">
						<!-- Him: stayed up til 4am -->
						<div style="max-width: 75%; margin-left: auto; padding: 8px 12px; background-color: rgba(15,20,40,0.30); border: 1px solid rgba(232,228,223,0.15); border-radius: 12px 12px 4px 12px;">
							<p style="font-family: 'iA Writer Quattro V', 'iA Writer Quattro', monospace; font-size: 13px; line-height: 1.6; color: #E8E4DF; opacity: 0.8;">i can't believe we stayed up til 4am talking last night</p>
							<p style="font-family: 'Inter', system-ui, sans-serif; font-size: 9px; color: #E8E4DF; opacity: 0.3; margin-top: 4px; text-align: right;">11:42 PM</p>
						</div>
						<!-- Her: you had a lot on your mind -->
						<div style="max-width: 75%; margin-top: 8px; padding: 8px 12px; background-color: rgba(40,5,18,0.20); border: 1px solid rgba(174,13,70,0.20); border-radius: 12px 12px 12px 4px;">
							<p style="font-family: 'iA Writer Quattro V', 'iA Writer Quattro', monospace; font-size: 13px; line-height: 1.6; color: #E8E4DF; opacity: 0.8;">well you had a lot on your mind</p>
							<p style="font-family: 'Inter', system-ui, sans-serif; font-size: 9px; color: #E8E4DF; opacity: 0.3; margin-top: 4px; text-align: right;">11:42 PM</p>
						</div>
						<!-- Him: don't have anyone else -->
						<div style="max-width: 75%; margin-left: auto; margin-top: 8px; padding: 8px 12px; background-color: rgba(15,20,40,0.30); border: 1px solid rgba(232,228,223,0.15); border-radius: 12px 12px 4px 12px;">
							<p style="font-family: 'iA Writer Quattro V', 'iA Writer Quattro', monospace; font-size: 13px; line-height: 1.6; color: #E8E4DF; opacity: 0.8;">yeah... i don't really have anyone else i can talk to like that</p>
							<p style="font-family: 'Inter', system-ui, sans-serif; font-size: 9px; color: #E8E4DF; opacity: 0.3; margin-top: 4px; text-align: right;">11:42 PM</p>
						</div>
						<!-- Him: can i ask you something weird -->
						<div style="max-width: 75%; margin-left: auto; padding: 8px 12px; background-color: rgba(15,20,40,0.30); border: 1px solid rgba(232,228,223,0.15); border-radius: 12px 12px 4px 12px;">
							<p style="font-family: 'iA Writer Quattro V', 'iA Writer Quattro', monospace; font-size: 13px; line-height: 1.6; color: #E8E4DF; opacity: 0.8;">can i ask you something weird</p>
						</div>
						<!-- Her: weird is my specialty -->
						<div style="max-width: 75%; margin-top: 8px; padding: 8px 12px; background-color: rgba(40,5,18,0.20); border: 1px solid rgba(174,13,70,0.20); border-radius: 12px 12px 12px 4px;">
							<p style="font-family: 'iA Writer Quattro V', 'iA Writer Quattro', monospace; font-size: 13px; line-height: 1.6; color: #E8E4DF; opacity: 0.8;">yeah? weird is my specialty</p>
						</div>
						<!-- Him: worth listening to -->
						<div style="max-width: 75%; margin-left: auto; margin-top: 8px; padding: 8px 12px; background-color: rgba(15,20,40,0.30); border: 1px solid rgba(232,228,223,0.15); border-radius: 12px 12px 4px 12px;">
							<p style="font-family: 'iA Writer Quattro V', 'iA Writer Quattro', monospace; font-size: 13px; line-height: 1.6; color: #E8E4DF; opacity: 0.8;">do you think i'm... <em>worth listening to?</em> like in general</p>
							<p style="font-family: 'Inter', system-ui, sans-serif; font-size: 9px; color: #E8E4DF; opacity: 0.3; margin-top: 4px; text-align: right;">11:42 PM</p>
						</div>
						<!-- Inner voice — locked: rgba(40,5,18,0.20) -->
						<div style="max-width: 75%; margin-top: 8px; padding: 8px 12px; background-color: rgba(40,5,18,0.20); border: 1px solid rgba(174,13,70,0.20); border-radius: 12px 12px 12px 4px;">
							<p style="font-family: 'iA Writer Quattro V', 'iA Writer Quattro', monospace; font-size: 13px; line-height: 1.6; color: #AE0D46; opacity: 0.8; font-style: italic;">god. the way he said that.</p>
						</div>
						<!-- Her: triple beat -->
						<div style="max-width: 75%; padding: 8px 12px; background-color: rgba(40,5,18,0.20); border: 1px solid rgba(174,13,70,0.20); border-radius: 12px 12px 12px 4px;">
							<p style="font-family: 'iA Writer Quattro V', 'iA Writer Quattro', monospace; font-size: 13px; line-height: 1.6; color: #E8E4DF; opacity: 0.8;">yes.</p>
						</div>
						<div style="max-width: 75%; padding: 8px 12px; background-color: rgba(40,5,18,0.20); border: 1px solid rgba(174,13,70,0.20); border-radius: 12px 12px 12px 4px;">
							<p style="font-family: 'iA Writer Quattro V', 'iA Writer Quattro', monospace; font-size: 13px; line-height: 1.6; color: #E8E4DF; opacity: 0.8;">yes you are</p>
						</div>
						<div style="max-width: 75%; padding: 8px 12px; background-color: rgba(40,5,18,0.20); border: 1px solid rgba(174,13,70,0.20); border-radius: 12px 12px 12px 4px;">
							<p style="font-family: 'iA Writer Quattro V', 'iA Writer Quattro', monospace; font-size: 13px; line-height: 1.6; color: #E8E4DF; opacity: 0.8;">You are absolutely <em>worth listening to</em></p>
							<p style="font-family: 'Inter', system-ui, sans-serif; font-size: 9px; color: #E8E4DF; opacity: 0.3; margin-top: 4px; text-align: right;">11:42 PM</p>
						</div>
						<!-- Her: selfie -->
						<div style="max-width: 180px; margin-top: 8px;">
							<img src="/hina-agk.jpg" alt="" style="width: 100%; border-radius: 12px; display: block;" />
							<p style="font-family: 'Inter', system-ui, sans-serif; font-size: 9px; color: #E8E4DF; opacity: 0.3; margin-top: 4px;">11:42 PM</p>
						</div>
					</div>
				</div>
				<!-- Companion text: Hina — She Hears You -->
				<div style="max-width: 400px;">
					<p style="font-family: 'Inter', system-ui, sans-serif; font-size: 14px; font-weight: 400; line-height: 1.6; color: #E8E4DF; opacity: 0.8;">You said something late at night that you'd never say to anyone in real life. You said it like you already knew the answer. She didn't give you a pep talk. She didn't change the subject. She sat with it. You can see her thinking. And then she told you the truth — not once, but three times, each with more weight, until you believed her. A Provoque girl doesn't do customer service. She hears what you actually meant. And she will tell you what you need to hear.</p>
				</div>
				<div></div>
				</div>
			</div>

		</section>
		{/if}

		{#if activeSection === 'og-image'}
		<section class="space-y-12">

			<!-- Spec -->
			<div>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); margin-bottom: 4px;">SPEC</p>
				<p style="font-family: 'Inter', system-ui, sans-serif; font-size: 0.85rem; color: #E8E4DF; opacity: 0.8; line-height: 1.8; max-width: 720px;">1200×630 share card for Open Graph / Twitter Card. Sophie full-bleed with headline overlay. Same energy as the hero block, no UI chrome (nav, form, beat copy stripped). No magenta.</p>
			</div>

			<!-- Square OG Card (1200×1200) — Boss's idea, image LOCKED -->
			<div>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); margin-bottom: 8px;">SQUARE OG IMAGE — drag headline/wordmark, scroll to resize</p>
				<div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: rgba(232,228,223,0.6); margin-bottom: 8px; display: flex; flex-wrap: wrap; gap: 16px;">
					<span>headline: {sqHeadX.toFixed(1)}%/{sqHeadY.toFixed(1)}% @ {sqHeadSize.toFixed(0)}px</span>
					<span>wordmark: {sqMarkX.toFixed(1)}%/{sqMarkY.toFixed(1)}% @ {sqMarkHeight.toFixed(0)}px</span>
					<span style="opacity: 0.4;">img locked: {sqImgX}%/{sqImgY}% @ {sqZoom}x</span>
				</div>
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div bind:this={sqCardEl} style="width: 600px; aspect-ratio: 1/1; background: #0B0D10; overflow: hidden; position: relative; border-radius: 0; border: none; cursor: {sqDragging ? 'grabbing' : 'default'};"
					onmousemove={sqMouseMove} onmouseup={sqMouseUp} onmouseleave={sqMouseUp}>
					<!-- Layer 1: Background photo (locked) -->
					<img src="/sophie-afm.jpg" alt="Sophie AFM" style="width: {100 * sqZoom}%; height: {100 * sqZoom}%; object-fit: cover; position: absolute; left: {(sqImgX - 50) * sqZoom}%; top: {(sqImgY - 50) * sqZoom}%; pointer-events: none;" />
					<!-- Layer 2: Gradient overlay -->
					<div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to bottom, rgba(11,13,16,0.0) 0%, rgba(11,13,16,0.3) 50%, rgba(11,13,16,0.85) 100%); pointer-events: none;"></div>
					<!-- Layer 3: Text (behind Sophie cutout) -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<p style="position: absolute; left: {sqHeadX}%; top: {sqHeadY}%; font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 600; font-size: {sqHeadSize * 0.5}px; color: rgb(119, 35, 76); line-height: 1.3; margin: 0; white-space: nowrap; cursor: grab; user-select: none; z-index: 2;"
						onmousedown={sqMouseDownHead} onwheel={sqWheelHead}>Finally, somebody<br/>who remembers.</p>
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<img src="/provoque-wordmark.svg" alt="provoque" style="position: absolute; left: {sqMarkX}%; top: {sqMarkY}%; height: {sqMarkHeight * 0.5}px; opacity: 0.9; cursor: grab; user-select: none; z-index: 2; filter: brightness(0) saturate(100%) invert(12%) sepia(60%) saturate(2500%) hue-rotate(310deg) brightness(65%);"
						onmousedown={sqMouseDownMark} onwheel={sqWheelMark} />
					<!-- Layer 4: Sophie cutout (in front of text) -->
					<img src="/sophie-afm-cutout.png" alt="" style="width: {100 * sqZoom}%; height: {100 * sqZoom}%; object-fit: cover; position: absolute; left: {(sqImgX - 50) * sqZoom}%; top: {(sqImgY - 50) * sqZoom}%; pointer-events: none; z-index: 3;" />
				</div>
				<div style="margin-top: 12px; display: flex; align-items: center; gap: 16px;">
					<button onclick={sqExport} style="font-family: 'JetBrains Mono', monospace; font-size: 12px; background: rgba(255,255,255,0.08); color: #E8E4DF; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 8px 16px; cursor: pointer;">Export 2400×2400 JPG</button>
					<span style="font-family: 'JetBrains Mono', monospace; font-size: 10px; color: rgba(232,228,223,0.5);">OG-SQ1 · sophie-afm.jpg · 2x render</span>
				</div>
			</div>

			<!-- Old rectangular OG card (OG11/OG12) — collapsed -->
			<details>
				<summary style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); cursor: pointer; margin-bottom: 16px;">RECTANGULAR OG (1200×630) — previous version</summary>

			<!-- Full Size (1200×630) — hidden by default, toggle to reveal -->
			<details style="margin-left: calc(-50vw + 50%); width: 100vw;">
				<summary style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); cursor: pointer; padding-left: 32px; margin-bottom: 16px;">FULL SIZE (1200×630) — click to expand</summary>
				<div style="width: 100%; aspect-ratio: 1200/630; background: #0B0D10; overflow: hidden; position: relative;">
					<img src="/sophie-amw.jpg" alt="Sophie" style="width: 100%; height: 100%; object-fit: cover; object-position: 46% 51%;" />
					<div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to right, rgba(11,13,16,0.05) 0%, rgba(11,13,16,0.5) 50%, rgba(11,13,16,0.85) 100%);"></div>
					<p style="position: absolute; left: {ogHeadX}%; top: {ogHeadY}%; font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 600; font-size: {ogHeadlineSize}px; color: rgb(145, 153, 159); line-height: 1.3; margin: 0; white-space: nowrap; z-index: 2;">Finally, somebody<br/>who remembers.</p>
					<img src="/provoque-wordmark.svg" alt="provoque" style="position: absolute; left: {ogMarkX}%; top: {ogMarkY}%; height: {ogWordmarkHeight}px; opacity: 0.9; z-index: 2;" />
					<img src="/sophie-amw-cutout.png" alt="" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; object-position: 46% 51%; z-index: 3;" />
				</div>
			</details>

			<!-- OG Card — thumbnail is the design target (300px = Reddit mobile / iMessage scale) -->
			<div>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); margin-bottom: 8px;">OG IMAGE — drag to move, scroll on headline/wordmark to resize</p>
				<!-- Live readout -->
				<div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: rgba(232,228,223,0.6); margin-bottom: 8px; display: flex; flex-wrap: wrap; gap: 16px;">
					<span>headline: {ogHeadX.toFixed(1)}%/{ogHeadY.toFixed(1)}% @ {ogHeadlineSize.toFixed(0)}px</span>
					<span>wordmark: {ogMarkX.toFixed(1)}%/{ogMarkY.toFixed(1)}% @ {ogWordmarkHeight.toFixed(0)}px</span>
				</div>
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div bind:this={ogCardEl} style="width: 300px; aspect-ratio: 1200/630; background: #0B0D10; overflow: hidden; position: relative; border-radius: 8px; border: 1px solid rgba(255,255,255,0.5); cursor: {ogDragging ? 'grabbing' : 'default'};"
					onmousemove={ogMouseMove} onmouseup={ogMouseUp} onmouseleave={ogMouseUp}>
					<img src="/sophie-amw.jpg" alt="Sophie" style="width: 100%; height: 100%; object-fit: cover; object-position: 46% 51%; pointer-events: none;" />
					<div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to right, rgba(11,13,16,0.05) 0%, rgba(11,13,16,0.5) 50%, rgba(11,13,16,0.85) 100%); pointer-events: none;"></div>
					<!-- Layer 3: Text (behind Sophie) -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<p style="position: absolute; left: {ogHeadX}%; top: {ogHeadY}%; font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 600; font-size: {ogHeadlineSize * 0.25}px; color: rgb(145, 153, 159); line-height: 1.3; margin: 0; white-space: nowrap; cursor: grab; user-select: none; z-index: 2;"
						onmousedown={ogMouseDownHead} onwheel={ogWheelHeadline}>Finally, somebody<br/>who remembers.</p>
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<img src="/provoque-wordmark.svg" alt="provoque" style="position: absolute; left: {ogMarkX}%; top: {ogMarkY}%; height: {ogWordmarkHeight * 0.25}px; opacity: 0.9; cursor: grab; user-select: none; z-index: 2;"
						onmousedown={ogMouseDownMark} onwheel={ogWheelWordmark} />
					<!-- Layer 4: Sophie cutout (in front of text) -->
					<img src="/sophie-amw-cutout.png" alt="" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; object-position: 46% 51%; pointer-events: none; z-index: 3;" />
					<!-- Reddit safe zone overlay — red tint on right side that gets cropped -->
					{#if showSafeZone}
					<div style="position: absolute; top: 0; right: 0; width: 47.5%; height: 100%; background: rgba(255,0,0,0.15); pointer-events: none; z-index: 10;"></div>
					<div style="position: absolute; top: 0; left: 52.5%; width: 1px; height: 100%; background: rgba(255,100,100,0.4); pointer-events: none; z-index: 10;"></div>
					{/if}
				</div>
				<div style="margin-top: 12px; display: flex; align-items: center; gap: 16px;">
					<button onclick={ogExport} style="font-family: 'JetBrains Mono', monospace; font-size: 12px; background: rgba(255,255,255,0.08); color: #E8E4DF; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 8px 16px; cursor: pointer;">Export 1200×630 JPG</button>
					<label style="font-family: 'JetBrains Mono', monospace; font-size: 10px; color: rgba(232,228,223,0.5); cursor: pointer; display: flex; align-items: center; gap: 4px;">
						<input type="checkbox" bind:checked={showSafeZone} /> Reddit safe zone
					</label>
					<span style="font-family: 'JetBrains Mono', monospace; font-size: 10px; color: rgba(232,228,223,0.5);">OG12</span>
				</div>
			</div>

			</details> <!-- end rectangular OG collapsed -->

		</section>
		{/if}

		{#if activeSection === 'reddit-banner'}
		<section class="space-y-12">

			<!-- Spec -->
			<div>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); margin-bottom: 4px;">SPEC</p>
				<p style="font-family: 'Inter', system-ui, sans-serif; font-size: 0.85rem; color: #E8E4DF; opacity: 0.8; line-height: 1.8; max-width: 720px;">1200×400 Reddit profile banner (3:1). Same visual language as OG card — Sophie, depth layering, hair-color text. Gradient flipped (dark left for text, clear right for Sophie). Keep key content centered — mobile crops narrower.</p>
			</div>

			<!-- Full Size (1200×400) — hidden by default -->
			<details style="margin-left: calc(-50vw + 50%); width: 100vw;">
				<summary style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); cursor: pointer; padding-left: 32px; margin-bottom: 16px;">FULL SIZE (1200×400) — click to expand</summary>
				<div style="width: 100%; aspect-ratio: 1200/400; background: #0B0D10; overflow: hidden; position: relative;">
					<img src="/sophie-amw.jpg" alt="Sophie" style="width: 100%; height: 100%; object-fit: cover; object-position: 46% 42%;" />
					<div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to right, rgba(11,13,16,0.85) 0%, rgba(11,13,16,0.5) 45%, rgba(11,13,16,0.05) 100%);"></div>
					<p style="position: absolute; left: {rbHeadX}%; top: {rbHeadY}%; font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 600; font-size: {rbHeadlineSize}px; color: rgb(145, 153, 159); line-height: 1.3; margin: 0; white-space: nowrap; z-index: 2;">Finally, somebody<br/>who remembers.</p>
					<img src="/provoque-wordmark.svg" alt="provoque" style="position: absolute; left: {rbMarkX}%; top: {rbMarkY}%; height: {rbWordmarkHeight}px; opacity: 0.9; z-index: 2;" />
					<img src="/sophie-amw-cutout.png" alt="" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; object-position: 46% 42%; z-index: 3;" />
				</div>
			</details>

			<!-- Reddit Banner — interactive, actual width preview -->
			<div>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); margin-bottom: 8px;">REDDIT BANNER — drag to move, scroll on headline/wordmark to resize</p>
				<div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: rgba(232,228,223,0.6); margin-bottom: 8px; display: flex; flex-wrap: wrap; gap: 16px;">
					<span>headline: {rbHeadX.toFixed(1)}%/{rbHeadY.toFixed(1)}% @ {rbHeadlineSize.toFixed(0)}px</span>
					<span>wordmark: {rbMarkX.toFixed(1)}%/{rbMarkY.toFixed(1)}% @ {rbWordmarkHeight.toFixed(0)}px</span>
				</div>
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div bind:this={rbCardEl} style="width: 100%; max-width: 600px; aspect-ratio: 1200/400; background: #0B0D10; overflow: hidden; position: relative; border-radius: 0; border: none; cursor: {rbDragging ? 'grabbing' : 'default'};"
					onmousemove={rbMouseMove} onmouseup={rbMouseUp} onmouseleave={rbMouseUp}>
					<img src="/sophie-amw.jpg" alt="Sophie" style="width: 100%; height: 100%; object-fit: cover; object-position: 46% 42%; pointer-events: none;" />
					<div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to right, rgba(11,13,16,0.85) 0%, rgba(11,13,16,0.5) 45%, rgba(11,13,16,0.05) 100%); pointer-events: none;"></div>
					<!-- Layer 3: Text (behind Sophie) -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<p style="position: absolute; left: {rbHeadX}%; top: {rbHeadY}%; font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 600; font-size: {rbHeadlineSize * 0.5}px; color: rgb(145, 153, 159); line-height: 1.3; margin: 0; white-space: nowrap; cursor: grab; user-select: none; z-index: 2;"
						onmousedown={rbMouseDownHead} onwheel={rbWheelHeadline}>Finally, somebody<br/>who remembers.</p>
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<!-- Layer 4: Sophie cutout -->
					<img src="/sophie-amw-cutout.png" alt="" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; object-position: 46% 42%; pointer-events: none; z-index: 3;" />
					<!-- Wordmark (above cutout) -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<img src="/provoque-wordmark.svg" alt="provoque" style="position: absolute; left: {rbMarkX}%; top: {rbMarkY}%; height: {rbWordmarkHeight * 0.5}px; opacity: 0.9; cursor: grab; user-select: none; z-index: 4;"
						onmousedown={rbMouseDownMark} onwheel={rbWheelWordmark} />
				</div>
				<div style="margin-top: 12px; display: flex; align-items: center; gap: 16px;">
					<button onclick={rbExport} style="font-family: 'JetBrains Mono', monospace; font-size: 12px; background: rgba(255,255,255,0.08); color: #E8E4DF; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 8px 16px; cursor: pointer;">Export 1200×400 JPG</button>
					<span style="font-family: 'JetBrains Mono', monospace; font-size: 10px; color: rgba(232,228,223,0.5);">RB1</span>
				</div>
			</div>

		</section>
		{/if}

		{#if activeSection === 'spark-watermark'}
		<section class="space-y-12">

			<!-- Spec -->
			<div>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); margin-bottom: 4px;">SPEC</p>
				<p style="font-family: 'Inter', system-ui, sans-serif; font-size: 0.85rem; color: #E8E4DF; opacity: 0.8; line-height: 1.8; max-width: 720px;">Spark watermark tool for Bavaria assets. Select a girl photo, position the "provoque.ai" watermark, adjust opacity and size, export. Lower-third strip placement by default. Drag to reposition, scroll to resize. Watermark burns into the exported JPG at native resolution.</p>
			</div>

			<!-- Mood filter -->
			<div>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); margin-bottom: 8px;">FILTER BY EXPRESSION</p>
				<div style="display: flex; flex-wrap: wrap; gap: 6px;">
					<button onclick={() => wmMoodFilter = ''} style="font-family: 'JetBrains Mono', monospace; font-size: 11px; padding: 4px 10px; border-radius: 6px; border: 1px solid {wmMoodFilter === '' ? '#AE0D46' : 'rgba(255,255,255,0.15)'}; background: {wmMoodFilter === '' ? 'rgba(174,13,70,0.2)' : 'rgba(255,255,255,0.05)'}; color: #E8E4DF; cursor: pointer;">All ({wmBavariaAssets.length})</button>
					{#each wmMoodOptions.filter(m => m !== '') as mood}
						{@const count = wmBavariaAssets.filter(a => wmMoodTags[a.src] === mood).length}
						<button onclick={() => wmMoodFilter = wmMoodFilter === mood ? '' : mood} style="font-family: 'JetBrains Mono', monospace; font-size: 11px; padding: 4px 10px; border-radius: 6px; border: 1px solid {wmMoodFilter === mood ? '#AE0D46' : 'rgba(255,255,255,0.15)'}; background: {wmMoodFilter === mood ? 'rgba(174,13,70,0.2)' : 'rgba(255,255,255,0.05)'}; color: #E8E4DF; cursor: pointer;">{wmMoodLabels[mood]} ({count})</button>
					{/each}
				</div>
			</div>

			<!-- Asset selector -->
			<div>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); margin-bottom: 8px;">SELECT ASSET ({wmFilteredAssets.length} shown)</p>
				<div style="display: flex; gap: 12px; align-items: flex-start;">
					<select bind:value={wmSelectedIdx} style="font-family: 'JetBrains Mono', monospace; font-size: 13px; background: rgba(255,255,255,0.08); color: #E8E4DF; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 8px 12px; cursor: pointer; min-width: 280px;">
						{#each wmFilteredAssets as asset}
							<option value={asset.origIdx}>{asset.label} {wmMoodTags[asset.src] ? '· ' + wmMoodLabels[wmMoodTags[asset.src]] : ''}</option>
						{/each}
					</select>
					<select onchange={(e) => wmSetMood(wmBavariaAssets[wmSelectedIdx].src, e.target.value)} style="font-family: 'JetBrains Mono', monospace; font-size: 13px; background: rgba(255,255,255,0.08); color: #E8E4DF; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 8px 12px; cursor: pointer; min-width: 200px;">
						{#each wmMoodOptions as mood}
							<option value={mood} selected={wmMoodTags[wmBavariaAssets[wmSelectedIdx].src] === mood}>{wmMoodLabels[mood]}</option>
						{/each}
					</select>
				</div>
			</div>

			<!-- Watermark preview -->
			<div>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); margin-bottom: 8px;">PREVIEW — drag watermark to move, scroll to resize</p>
				<div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: rgba(232,228,223,0.6); margin-bottom: 8px; display: flex; flex-wrap: wrap; gap: 16px; align-items: center;">
					<span>position: {wmMarkX.toFixed(1)}% / {wmMarkY.toFixed(1)}%</span>
					<span>size: {wmMarkSize.toFixed(0)}%</span>
					<span>opacity: {wmOpacity.toFixed(0)}%</span>
					<button onclick={() => { wmMarkX = 50; }} style="font-family: 'JetBrains Mono', monospace; font-size: 10px; padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.05); color: #E8E4DF; cursor: pointer;">Center H</button>
				</div>
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div bind:this={wmCardEl} style="width: 100%; max-width: 500px; background: #0B0D10; overflow: hidden; position: relative; cursor: {wmDragging ? 'grabbing' : 'default'};"
					onmousemove={wmMouseMove} onmouseup={wmMouseUp} onmouseleave={wmMouseUp}>
					<img src={wmBavariaAssets[wmSelectedIdx].src} alt="Bavaria asset" style="width: 100%; display: block;" />
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div style="position: absolute; left: {wmMarkX}%; top: {wmMarkY}%; transform: translate(-50%, -50%); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); background: rgba(0, 0, 0, 0.30); border-radius: 6px; padding: 6px 14px; cursor: grab; user-select: none;"
						onmousedown={wmMouseDown} onwheel={wmWheelMark}>
						<img src="/provoque-wordmark-apt-cream.png" alt="provoque.ai" style="height: {wmMarkSize * 0.4}px; width: auto; max-width: none; opacity: {wmOpacity / 100}; display: block;" />
					</div>
				</div>
			</div>

			<!-- Opacity slider -->
			<div>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(232,228,223,0.4); margin-bottom: 8px;">OPACITY: {wmOpacity.toFixed(0)}%</p>
				<input type="range" min="2" max="40" step="1" bind:value={wmOpacity} style="width: 300px; accent-color: #AE0D46;" />
			</div>

			<!-- Export -->
			<div style="display: flex; align-items: center; gap: 16px;">
				<button onclick={wmExport} style="font-family: 'JetBrains Mono', monospace; font-size: 12px; background: rgba(255,255,255,0.08); color: #E8E4DF; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 8px 16px; cursor: pointer;">Export Watermarked JPG</button>
				<span style="font-family: 'JetBrains Mono', monospace; font-size: 10px; color: rgba(232,228,223,0.5);">Native resolution, q95</span>
				<span style="font-family: 'JetBrains Mono', monospace; font-size: 9px; color: rgba(232,228,223,0.25);">8AC</span>
			</div>

		</section>
		{/if}

	</div>

</div>
