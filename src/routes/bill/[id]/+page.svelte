<script lang="ts">
	import { page } from '$app/state';
	import BillForm from '$lib/components/BillForm.svelte';
</script>

<!-- Re-mount the form when the bill id changes so it reloads the right record. -->
{#key page.params.id}
	<BillForm billId={page.params.id ?? null} />
{/key}
