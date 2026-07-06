<script lang="ts">
	import { page } from '$app/state';
	import BillForm from '$lib/components/BillForm.svelte';
</script>

<!--
	Edit lives at /bill/edit/[id] (NOT /bill/[id]) so a bill whose id is "new" cannot be
	shadowed by the static create route /bill/new — a collision that URL-encoding cannot
	fix. `page.params.id` is already URL-decoded by SvelteKit, so it round-trips exactly
	with the encodeURIComponent(id) used in the link (ids may contain reserved URL chars
	like / ? # %). We deliberately do NOT decode again — a second decodeURIComponent would
	corrupt an id that legitimately contains "%".
	Re-mount the form when the id changes so it reloads the right record.
-->
{#key page.params.id}
	<BillForm billId={page.params.id ?? null} />
{/key}
