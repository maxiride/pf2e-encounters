<script lang="ts">
  import halImage from './assets/hal-9000.webp';

  interface Props {
    items: string[];
  }

  let { items }: Props = $props();
</script>

<div class="disclosure-card">
  <ul class="disclosure-list">
    {#each items as item, i}
      <li class="disclosure-item" style="--fi:{i}">
        <span class="text">{item}</span>
      </li>
    {/each}
  </ul>
  <div class="hal-column">
    <div class="hal-frame">
      <img src={halImage} alt="HAL 9000" />
    </div>
  </div>
</div>

<style>
  .disclosure-card {
    display: flex;
    align-items: center;
    gap: var(--space-32);
    margin-top: var(--space-20);
    background: var(--surface-neutral-lowest);
    border: var(--border-width-1) solid var(--border-neutral-subtle);
    border-radius: var(--radius-xl);
    padding: var(--space-16) var(--space-32);
  }

  .disclosure-list {
    list-style: none;
    margin: 0;
    padding: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .disclosure-item {
    display: flex;
    align-items: baseline;
    gap: var(--space-16);
  }

  .text {
    font-family: var(--font-sans);
    font-size: var(--font-size-2xl);
    color: var(--text-secondary);
    line-height: var(--line-height-relaxed);
  }

  .hal-column {
    flex-shrink: 0;
    width: 25%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .hal-frame {
    width: 100%;
    max-width: 128px;
    aspect-ratio: 1;
    border-radius: var(--radius-full);
    overflow: hidden;
  }
  .hal-frame img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  @media (max-width: 768px) {
    .disclosure-card {
      flex-direction: column-reverse;
      align-items: center;
      gap: var(--space-24);
      padding: var(--space-24) var(--space-20);
    }
    .hal-column {
      width: auto;
    }
    .hal-frame {
      max-width: 100px;
    }
  }
</style>
