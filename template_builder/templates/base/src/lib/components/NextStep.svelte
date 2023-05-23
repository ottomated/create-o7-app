<script lang="ts">
	export let title: string;
	export let learnMore: string;
</script>

<section class="card">
	<h1 class="title">{title}</h1>
	<slot />
	<a href={learnMore} target="_blank" rel="noreferrer" class="learn-more">
		Learn more
	</a>
</section>

<style>
	.card {
		display: flex;
		width: 33.333333%;
		flex-direction: column;
		gap: 0.5rem;
		border-radius: 0.5rem;
		background: rgb(39 39 42);
		padding: 1rem;
		box-shadow: rgba(0, 0, 0, 0.1) 0px 10px 15px -3px,
			rgba(0, 0, 0, 0.1) 0px 4px 6px -4px;
	}
	.title {
		margin-bottom: 0.5rem;
		font-size: 1.25rem;
		line-height: 1.75rem;
		font-weight: 700;
	}
	.learn-more {
		margin-top: auto;
		padding-top: 0.75rem;
		text-align: right;
		color: rgb(96 165 250);
	}
	.learn-more:hover {
		text-decoration: underline;
	}
</style>
