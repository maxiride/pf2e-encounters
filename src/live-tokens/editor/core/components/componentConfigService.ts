import type { AliasDiskValue, ComponentConfig, ComponentConfigMeta } from '../themes/themeTypes';
import { versionedFileResource } from '../storage/files/versionedFileResourceClient';

/**
 * REST client for per-component config files. Parallel to `themeService.ts`
 * but scoped to `/api/component-configs/*`. Each component (button, card, …)
 * has its own lifecycle: default.json (generated from the `.svelte` source),
 * plus user-authored named configs, each with its own active / production
 * pointer.
 *
 * Both this and `themeService` consume `versionedFileResource(...)`. Adding a
 * third file-managed resource — per the user's "mirror theme-file lifecycle
 * for new editor artifacts" invariant — is one helper call here, not a third
 * round of copy-paste CRUD.
 */

export interface ComponentSummary {
  name: string;
  activeFile: string;
  productionFile: string;
}

export interface ComponentProductionInfo {
  fileName: string;
  name: string;
  aliases: Record<string, AliasDiskValue>;
}

export interface ComponentConfigList {
  component: string;
  files: ComponentConfigMeta[];
  activeFile: string;
  productionFile: string;
}

export async function listComponents(): Promise<ComponentSummary[]> {
  const res = await fetch('/api/component-configs');
  if (!res.ok) throw new Error('Failed to list components');
  const data = await res.json();
  return data.components;
}

function resourceFor(component: string) {
  return versionedFileResource<ComponentConfig, ComponentConfigMeta, ComponentProductionInfo>({
    baseUrl: `/api/component-configs/${encodeURIComponent(component)}`,
  });
}

export async function listComponentConfigs(component: string): Promise<ComponentConfigList> {
  const data = await resourceFor(component).list();
  return {
    component,
    files: data.files,
    activeFile: data.activeFile ?? 'default',
    productionFile: data.productionFile ?? 'default',
  };
}

export const loadComponentConfig = (
  component: string,
  fileName: string,
): Promise<ComponentConfig> => resourceFor(component).load(fileName);

export const saveComponentConfig = (
  component: string,
  fileName: string,
  data: ComponentConfig,
): Promise<void> => resourceFor(component).save(fileName, data);

export const deleteComponentConfig = (component: string, fileName: string): Promise<void> =>
  resourceFor(component).remove(fileName);

export const getActiveComponentConfig = (component: string): Promise<ComponentConfig | null> =>
  resourceFor(component).getActive();

export const setActiveComponentFile = (component: string, fileName: string): Promise<void> =>
  resourceFor(component).setActive(fileName);

export const getComponentProductionInfo = (component: string): Promise<ComponentProductionInfo> =>
  resourceFor(component).getProductionInfo();

export async function setComponentProductionFile(
  component: string,
  fileName: string,
): Promise<{ ok: boolean; productionFile: string }> {
  const data = await resourceFor(component).setProduction(fileName);
  return { ok: data.ok, productionFile: data.fileName };
}
