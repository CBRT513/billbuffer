<script lang="ts">
	import { page } from '$app/state';
	import BillForm from '$lib/components/BillForm.svelte';
</script>

<!--
	`page.params.id` is already URL-decoded by SvelteKit, so it round-trips exactly with
	the encodeURIComponent(id) used to build the link (ids may contain reserved URL chars
	like / ? # %). We deliberately do NOT decode again — a second decodeURIComponent would
	corrupt an id that legitimately contains "%".
	Re-mount the form when the id changes so it reloads the right record.
-->
{#key page.params.id}
	<BillForm billId={page.params.id ?? null} />
{/key}
