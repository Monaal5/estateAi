export type DealPurpose = 'purchase' | 'refinance' | 'construction';
export type DealStage = 'provisional' | 'intake_active' | 'in_review' | 'underwriting_ready' | 'submitted' | 'conditional_approval' | 'closed';
export type ComplianceStatus = 'pending_consent' | 'consent_verified' | 'kyc_cleared' | 'locked_for_submission';
export type ParticipantRole = 'borrower' | 'broker' | 'processor' | 'lender' | 'cpa' | 'admin';

export interface Money {
  amount: number;
  currency: 'USD' | 'EUR' | 'GBP';
}

export interface Tenant {
  id: string;
  name: string;
  retentionDays: number;
  createdAt: string;
}

export interface DealParticipant {
  id: string;
  dealId: string;
  personId: string;
  personName: string;
  role: ParticipantRole;
  permittedScope: Record<string, any>;
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface Document {
  id: string;
  dealId: string;
  storageKey: string;
  filename: string;
  sha256Digest: string;
  uploaderId: string;
  uploaderRole: ParticipantRole;
  sourceEventId: string;
  entityId?: string;
  period?: string;
  pageCount: number;
  processingState: 'received' | 'classified' | 'extracted' | 'reviewed';
  acceptanceState: 'intake_only' | 'lender_accepted' | 'rejected';
  docType: 'tax_return' | 'operating_statement' | 'rent_roll' | 'personal_financial_statement' | 'bank_statement' | 'appraisal' | 'other';
  versionOf?: string;
  uploadedAt: string;
  ocrTextPreview?: string;
}

export interface FieldObservation {
  id: string;
  dealId: string;
  fieldKey: string; // e.g. "debt.monthly_payment", "noi.annual", "property.appraised_value"
  value: any; // e.g. Money or string or number
  unit?: string;
  entityId?: string;
  period?: string;
  sourceDocId?: string;
  sourceDocName?: string;
  sourcePage?: number;
  sourceRegion?: { x: number; y: number; width: number; height: number };
  extractionMethod: 'ocr' | 'llm' | 'borrower_stated';
  confidence: number;
  reviewStatus: 'candidate' | 'confirmed' | 'rejected' | 'conflicted';
}

export interface CanonicalField {
  id: string;
  dealId: string;
  fieldKey: string;
  fieldLabel: string;
  acceptedValue: any;
  sourceObservationId: string;
  reviewerId?: string;
  reviewerName?: string;
  reviewedAt?: string;
  supersededById?: string;
}

export interface RequirementVersion {
  id: string;
  requirementId: string;
  title: string;
  description: string;
  program?: string; // e.g. "conventional", "sba_504"
  purpose?: DealPurpose;
  propertyType?: string;
  applicabilityExpr: Record<string, any>;
  evidenceSpec: {
    requiredDocType: string;
    periodRequired?: string;
    acceptedFormats: string[];
  };
  sourcePolicy: string;
  effectiveFrom: string;
  effectiveTo?: string;
  criticalFlag: boolean;
}

export type TaskStatus = 'open' | 'in_progress' | 'borrower_submitted' | 'under_review' | 'waived' | 'completed';

export interface Task {
  id: string;
  dealId: string;
  requirementId?: string;
  title: string;
  description: string;
  assigneeRole: ParticipantRole;
  status: TaskStatus;
  dueDate?: string;
  evidenceRefs: string[]; // document IDs
  waivedReason?: string;
  waivedBy?: string;
}

export interface DscrBands {
  label: 'Strong' | 'Adequate' | 'Marginal' | 'Weak';
  min: number;
  max: number;
  ltvMax: number;
}

export interface LenderPolicyVersion {
  id: string;
  lenderId: string;
  lenderName: string;
  product: string;
  criteria: {
    minDscr: number;
    maxLtv: number;
    dscrBands: DscrBands[];
  };
  effectiveFrom: string;
  effectiveTo?: string;
  reviewerId: string;
}

export interface DscrResult {
  dscr: number;
  noi: Money;
  existingDebtService: Money;
  proposedPayment: Money;
  totalDebtService: Money;
  asOf: string;
}

export interface GradeResult {
  grade: 'Strong' | 'Adequate' | 'Marginal' | 'Weak';
  rationale: string[];
  policyVersionId: string;
  dscr: DscrResult;
  ltv: number;
}

export interface AnalysisRun {
  id: string;
  dealId: string;
  inputSnapshot: Record<string, any>;
  policyVersionId: string;
  output: {
    dscr: DscrResult;
    lendingGrade: GradeResult;
    criticalBlockers: Array<{ code: string; message: string }>;
    completenessPercentage: number;
  };
  reviewerId?: string;
  createdAt: string;
}

export interface Submission {
  id: string;
  dealId: string;
  lenderId: string;
  lenderName: string;
  approvedById: string;
  approvedByName: string;
  contentsSnapshot: {
    dealStage: string;
    canonicalFields: CanonicalField[];
    documents: Array<{ id: string; filename: string; sha256: string }>;
    analysis: AnalysisRun['output'];
    timestamp: string;
  };
  deliveryStatus: 'pending' | 'delivered' | 'accepted_by_lender' | 'rejected_by_lender';
  sentAt?: string;
}

export interface ConsentRecord {
  id: string;
  dealId: string;
  purpose: 'contact' | 'third_party_info' | 'lender_submission';
  scope: Record<string, any>;
  noticeVersion: string;
  channel: string;
  recordedAt: string;
  revokedAt?: string;
}

export interface AuditEvent {
  id: string;
  tenantId: string;
  eventType: 
    | 'conversation.received'
    | 'deal.association_confirmed'
    | 'consent.recorded'
    | 'document.received'
    | 'document.classified'
    | 'observation.extracted'
    | 'observation.conflict_detected'
    | 'field.verified'
    | 'requirement.changed'
    | 'task.proposed'
    | 'task.reviewed'
    | 'task.completed'
    | 'submission.authorized'
    | 'submission.sent'
    | 'lender.condition_received'
    | 'condition.accepted'
    | 'decision.recorded'
    | 'funding.confirmed'
    | 'access.revoked';
  correlationId: string;
  actorId?: string;
  actorRole?: string;
  payload: Record<string, any>;
  occurredAt: string;
}

export interface Deal {
  id: string;
  tenantId: string;
  title: string;
  borrowerName: string;
  propertyAddress: string;
  purpose: DealPurpose;
  candidatePrograms: string[];
  selectedProgram: string;
  stage: DealStage;
  complianceStatus: ComplianceStatus;
  ownerUserId: string;
  requestedAmount: Money;
  proposedRate: number; // e.g. 0.0675 (6.75%)
  proposedTermMonths: number; // e.g. 300 (25 years)
  createdAt: string;
}

export interface LenderCondition {
  id: string;
  dealId: string;
  lenderId: string;
  originalText: string;
  parsedCategory: 'documentation' | 'insurance' | 'escrow' | 'legal' | 'appraisal';
  status: 'proposed' | 'processor_validated' | 'task_created' | 'borrower_submitted' | 'accepted_by_lender';
  receivedAt: string;
}
