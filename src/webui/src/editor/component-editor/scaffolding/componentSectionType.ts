import type { Component } from 'svelte';

export type ComponentSection = {
  id: string;
  label: string;
  component: Component<any, any, any>;
  props?: Record<string, unknown>;
};
