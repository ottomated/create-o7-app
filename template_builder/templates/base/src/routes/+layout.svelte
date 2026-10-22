<script lang="ts">
  import Favicon from '@o7/favicon';
	import '../app.css';

	const { children } = $props();
</script>

<Favicon />

{@render children()}
