<script lang="ts">
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import type { LayoutData } from './$types';
	import { trpc } from '$lib/trpc/client';

	export let data: LayoutData;

	const queryClient = trpc.hydrateQueryClient(data.trpc);
</script>

<QueryClientProvider client={queryClient}>
	<slot />
</QueryClientProvider>
