import { ConsentRecord, ParticipantRole, Task, CanonicalField } from '../types';

export interface PreconditionCheckResult {
  canSubmit: boolean;
  errors: Array<{ code: string; message: string }>;
}

export function validateSubmissionPreconditions(params: {
  dealId: string;
  lenderId: string;
  approverRole: ParticipantRole;
  consents: ConsentRecord[];
  tasks: Task[];
  canonicalFields: CanonicalField[];
}): PreconditionCheckResult {
  const errors: Array<{ code: string; message: string }> = [];

  // 1. Check Broker Role
  if (params.approverRole !== 'broker') {
    errors.push({
      code: 'unauthorized_approver',
      message: 'Only a broker may authorize and sign a submission package.',
    });
  }

  // 2. Check Active Consent for lender_submission
  const hasConsent = params.consents.some(
    (c) =>
      c.dealId === params.dealId &&
      c.purpose === 'lender_submission' &&
      !c.revokedAt
  );

  if (!hasConsent) {
    errors.push({
      code: 'consent_missing',
      message: 'No active lender_submission consent record verified for this deal and lender pair.',
    });
  }

  // 3. Check Critical Open Tasks
  const openCriticalTasks = params.tasks.filter(
    (t) => t.status !== 'completed' && t.status !== 'waived'
  );

  if (openCriticalTasks.length > 0) {
    errors.push({
      code: 'blockers_present',
      message: `There are ${openCriticalTasks.length} unfulfilled requirement task(s) blocking package generation.`,
    });
  }

  // 4. Check Key Canonical Fields (e.g. NOI, Appraised Value, Requested Amount)
  const requiredKeys = ['noi.annual', 'property.appraised_value', 'debt.existing_monthly'];
  const missingKeys = requiredKeys.filter(
    (key) => !params.canonicalFields.some((f) => f.fieldKey === key)
  );

  if (missingKeys.length > 0) {
    errors.push({
      code: 'missing_canonical_fields',
      message: `Missing confirmed canonical fields: ${missingKeys.join(', ')}.`,
    });
  }

  return {
    canSubmit: errors.length === 0,
    errors,
  };
}
