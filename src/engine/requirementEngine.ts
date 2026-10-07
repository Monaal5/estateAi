import { DealPurpose, RequirementVersion } from '../types';

export interface DealContext {
  program?: string;
  purpose: DealPurpose;
  propertyType?: string;
  entityStructure?: string[];
  stage: string;
}

/**
 * Pure deterministic requirement evaluation engine.
 * Never allows model/LLM calls to decide requirement applicability.
 */
export function applicableRequirements(
  ctx: DealContext,
  catalog: RequirementVersion[]
): RequirementVersion[] {
  const now = new Date();
  return catalog.filter((req) => {
    // 1. Effective date check
    if (new Date(req.effectiveFrom) > now) return false;
    if (req.effectiveTo && new Date(req.effectiveTo) < now) return false;

    // 2. Program matching check
    if (req.program && req.program !== ctx.program) return false;

    // 3. Purpose matching check
    if (req.purpose && req.purpose !== ctx.purpose) return false;

    // 4. Property type matching check
    if (req.propertyType && ctx.propertyType && req.propertyType !== ctx.propertyType) return false;

    return true;
  });
}
