import type { A2UIComponentDef, A2UISurfaceState } from './types';
import type { A2UIMessage } from '../lib/types';
import { setDataPath } from './dataBinding';

export function createEmptySurface(surfaceId: string): A2UISurfaceState {
  return {
    surfaceId,
    components: new Map(),
    dataModel: {},
  };
}

export function processSurfaceMessage(
  surfaces: Map<string, A2UISurfaceState>,
  msg: A2UIMessage,
): Map<string, A2UISurfaceState> {
  const next = new Map(surfaces);

  switch (msg.type) {
    case 'createSurface': {
      const payload = msg.payload as { catalogId?: string; theme?: Record<string, unknown> };
      const surface = createEmptySurface(msg.surfaceId);
      surface.catalogId = payload.catalogId;
      surface.theme = payload.theme;
      next.set(msg.surfaceId, surface);
      break;
    }

    case 'updateComponents': {
      const surface = next.get(msg.surfaceId);
      if (!surface) break;
      const components = msg.payload as A2UIComponentDef[];
      const updated = { ...surface, components: new Map(surface.components) };
      for (const comp of components) {
        updated.components.set(comp.id, comp);
      }
      next.set(msg.surfaceId, updated);
      break;
    }

    case 'updateDataModel': {
      const surface = next.get(msg.surfaceId);
      if (!surface) break;
      const payload = msg.payload as { path?: string; value: unknown };
      let newModel: Record<string, unknown>;
      if (payload.path) {
        newModel = setDataPath(surface.dataModel, payload.path, payload.value);
      } else {
        newModel = (typeof payload.value === 'object' && payload.value !== null)
          ? payload.value as Record<string, unknown>
          : surface.dataModel;
      }
      next.set(msg.surfaceId, { ...surface, dataModel: newModel });
      break;
    }

    case 'deleteSurface': {
      next.delete(msg.surfaceId);
      break;
    }
  }

  return next;
}

export function parseSurfaceFromPayload(payload: unknown): A2UISurfaceState | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;

  const surfaceId = (p.surfaceId as string) || 'inline';
  const surface = createEmptySurface(surfaceId);

  if (Array.isArray(p.components)) {
    for (const comp of p.components) {
      if (comp && typeof comp === 'object' && comp.id) {
        surface.components.set(comp.id, comp as A2UIComponentDef);
      }
    }
  }

  if (p.dataModel && typeof p.dataModel === 'object') {
    surface.dataModel = p.dataModel as Record<string, unknown>;
  }

  return surface.components.size > 0 ? surface : null;
}
