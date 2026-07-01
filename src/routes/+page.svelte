<script lang="ts">
	let { data } = $props();
</script>

<div style="display: flex; height: 100vh;">
	<!-- Sidebar -->
	<div class="hb-sidebar">
		<div class="hb-sidebar-scroll">
			<div class="hb-sidebar-header">
				<h2 class="hb-sidebar-header-text">Uember</h2>
			</div>
			<!-- Add sidebar items here -->
		</div>
		<div class="hb-sidebar-footer">
			Cache: ___
		</div>
	</div>

	<!-- Main content -->
	<div style="flex: 1; overflow-y: auto; padding: 2rem;">
		<p style="color: var(--color-text-muted);">Uember is ready. Start building.</p>
	</div>
</div>
