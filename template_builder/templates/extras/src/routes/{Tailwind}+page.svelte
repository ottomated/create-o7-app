<script lang="ts">
	import NextStep from '$lib/components/NextStep.svelte';
</script>

<main class="flex h-screen flex-col items-center justify-center">
	<img src="/favicon.png" class="w-32" alt="o7 Logo" />
	<h1 class="text-3xl font-bold">Welcome to the o7 stack!</h1>
	<h2 class="my-6 text-2xl">Next Steps:</h2>
	<div class="flex max-w-5xl justify-center gap-4 px-3">
		<NextStep
			title="Edit this page"
			learnMore="https://svelte.dev/tutorial/basics"
		>
			<p>
				Edit <code class="text-lime-300">src/routes/+page.svelte</code> to see your
				changes live.
			</p>
			<p>
				The source for these cards is in <code class="text-lime-300"
					>src/lib/components/NextStep.svelte</code
				>.
			</p>
			<p>
				There's some global styling in <code class="text-lime-300"
					>src/app.css</code
				>.
			</p>
		</NextStep>
	</div>
</main>

<style>
	code {
		background: theme('colors.zinc.900');
		padding: theme('spacing[0.5]');
	}
</style>
