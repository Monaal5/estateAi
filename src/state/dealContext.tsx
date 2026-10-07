import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Tenant,
  Deal,
  DealStage,
  Document,
  FieldObservation,
  CanonicalField,
  RequirementVersion,
  Task,
  LenderPolicyVersion,
  ConsentRecord,
  LenderCondition,
  AuditEvent,
  ParticipantRole,
  AnalysisRun,
  Submission,
} from '../types';
import {
  mockTenant,
  mockDeals,
  mockDocuments,
  mockObservations,
  mockCanonicalFields,
  mockRequirementCatalog,
  mockTasks,
  mockLenderPolicy,
  mockConsents,
  mockLenderConditions,
} from '../services/mockData';
import { calculateDSCR, gradeDeal } from '../engine/dscrCalculator';
import { applicableRequirements } from '../engine/requirementEngine';
import { validateSubmissionPreconditions } from '../engine/submissionGateEngine';
import { eventBus } from '../engine/eventBus';

interface DealContextType {
  tenant: Tenant;
  deals: Deal[];
  activeDeal: Deal;
  activeRole: ParticipantRole;
  setActiveRole: (role: ParticipantRole) => void;
  setActiveDealId: (id: string) => void;
  documents: Document[];
  observations: FieldObservation[];
  canonicalFields: CanonicalField[];
  requirements: RequirementVersion[];
  tasks: Task[];
  policy: LenderPolicyVersion;
  consents: ConsentRecord[];
  lenderConditions: LenderCondition[];
  auditLogs: AuditEvent[];
  latestAnalysis?: AnalysisRun['output'];
  submissions: Submission[];
  
  // State Mutators (Backend API Simulations)
  confirmFieldObservation: (observationId: string, acceptedValue: any) => void;
  rejectFieldObservation: (observationId: string) => void;
  completeTask: (taskId: string) => void;
  waiveRequirement: (taskId: string, reason: string) => void;
  runFinancialAnalysis: () => AnalysisRun['output'];
  createSubmissionPackage: (lenderId: string) => { success: boolean; error?: string; submission?: Submission };
  updateConditionStatus: (conditionId: string, status: LenderCondition['status']) => void;
  uploadDocument: (filename: string, docType: Document['docType']) => void;
  
  // UI Viewer State
  selectedDocForViewer?: Document;
  setSelectedDocForViewer: (doc?: Document) => void;
  highlightedRegion?: { x: number; y: number; width: number; height: number };
  setHighlightedRegion: (region?: { x: number; y: number; width: number; height: number }) => void;
}

const DealContext = createContext<DealContextType | undefined>(undefined);

export const DealProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deals, setDeals] = useState<Deal[]>(mockDeals);
  const [activeDealId, setActiveDealId] = useState<string>(mockDeals[0].id);
  const [activeRole, setActiveRole] = useState<ParticipantRole>('broker');
  
  const [documents, setDocuments] = useState<Document[]>(mockDocuments);
  const [observations, setObservations] = useState<FieldObservation[]>(mockObservations);
  const [canonicalFields, setCanonicalFields] = useState<CanonicalField[]>(mockCanonicalFields);
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [consents] = useState<ConsentRecord[]>(mockConsents);
  const [lenderConditions, setLenderConditions] = useState<LenderCondition[]>(mockLenderConditions);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>([]);
  
  const [selectedDocForViewer, setSelectedDocForViewer] = useState<Document | undefined>(mockDocuments[0]);
  const [highlightedRegion, setHighlightedRegion] = useState<{ x: number; y: number; width: number; height: number } | undefined>();

  const activeDeal = deals.find((d) => d.id === activeDealId) || deals[0];

  // Subscribe to EventBus to collect audit events
  useEffect(() => {
    const unsubscribe = eventBus.subscribe((evt) => {
      setAuditLogs((prev) => [evt, ...prev]);
    });

    // Initial boot audit event
    eventBus.publish('deal.association_confirmed', mockTenant.id, 'user_broker_sarah', 'broker', {
      dealId: activeDeal.id,
      stage: activeDeal.stage,
      borrower: activeDeal.borrowerName,
    });

    return () => unsubscribe();
  }, [activeDealId]);

  // Active Applicable Requirements based on pure engine
  const requirements = applicableRequirements(
    {
      program: activeDeal.selectedProgram,
      purpose: activeDeal.purpose,
      stage: activeDeal.stage,
    },
    mockRequirementCatalog
  );

  // 1. Confirm Field Observation -> Promotes Candidate Observation to Canonical Field
  const confirmFieldObservation = (observationId: string, acceptedValue: any) => {
    const obs = observations.find((o) => o.id === observationId);
    if (!obs) return;

    // Mark observation confirmed
    setObservations((prev) =>
      prev.map((o) => (o.id === observationId ? { ...o, reviewStatus: 'confirmed' } : o))
    );

    const existingCanonical = canonicalFields.find((f) => f.fieldKey === obs.fieldKey);
    const newCanonicalId = `cf_${Date.now()}`;

    const newCanonical: CanonicalField = {
      id: newCanonicalId,
      dealId: activeDeal.id,
      fieldKey: obs.fieldKey,
      fieldLabel: obs.fieldKey === 'noi.annual' ? 'Annual Net Operating Income (NOI)' : obs.fieldKey,
      acceptedValue,
      sourceObservationId: obs.id,
      reviewerId: 'user_broker_sarah',
      reviewerName: 'Sarah Jenkins',
      reviewedAt: new Date().toISOString(),
      supersededById: existingCanonical?.id,
    };

    setCanonicalFields((prev) => [...prev.filter((f) => f.fieldKey !== obs.fieldKey), newCanonical]);

    // Emit Audit Event
    eventBus.publish('field.verified', mockTenant.id, 'user_broker_sarah', activeRole, {
      dealId: activeDeal.id,
      fieldKey: obs.fieldKey,
      acceptedValue,
      sourceObservationId: obs.id,
    });
  };

  // 2. Reject Field Observation
  const rejectFieldObservation = (observationId: string) => {
    setObservations((prev) =>
      prev.map((o) => (o.id === observationId ? { ...o, reviewStatus: 'rejected' } : o))
    );

    eventBus.publish('observation.conflict_detected', mockTenant.id, 'user_broker_sarah', activeRole, {
      dealId: activeDeal.id,
      observationId,
      status: 'rejected_by_broker',
    });
  };

  // 3. Complete Task
  const completeTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: 'completed' } : t))
    );

    eventBus.publish('task.completed', mockTenant.id, 'user_broker_sarah', activeRole, {
      dealId: activeDeal.id,
      taskId,
    });
  };

  // 4. Waive Requirement Task
  const waiveRequirement = (taskId: string, reason: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: 'waived', waivedReason: reason, waivedBy: 'Sarah Jenkins' }
          : t
      )
    );

    eventBus.publish('requirement.changed', mockTenant.id, 'user_broker_sarah', activeRole, {
      dealId: activeDeal.id,
      taskId,
      action: 'waived',
      reason,
    });
  };

  // 5. Deterministic Financial Analysis Execution (Pure computation)
  const runFinancialAnalysis = React.useCallback(() => {
    const noiCanonical = canonicalFields.find((f) => f.fieldKey === 'noi.annual')?.acceptedValue ||
      observations.find((o) => o.fieldKey === 'noi.annual')?.value || { amount: 585000, currency: 'USD' };

    const debtCanonical = canonicalFields.find((f) => f.fieldKey === 'debt.existing_monthly')?.acceptedValue || { amount: 12400, currency: 'USD' };
    const appraisalCanonical = canonicalFields.find((f) => f.fieldKey === 'property.appraised_value')?.acceptedValue || { amount: 6200000, currency: 'USD' };

    const dscrResult = calculateDSCR({
      noi: noiCanonical,
      existingDebtService: debtCanonical,
      proposedLoanAmount: activeDeal.requestedAmount,
      proposedRate: activeDeal.proposedRate,
      proposedTermMonths: activeDeal.proposedTermMonths,
    });

    const grade = gradeDeal(dscrResult, mockLenderPolicy, appraisalCanonical, activeDeal.requestedAmount);

    const openTasks = tasks.filter((t) => t.status !== 'completed' && t.status !== 'waived');
    const blockers = openTasks.map((t) => ({
      code: `task_${t.id}`,
      message: `Pending requirement: "${t.title}"`,
    }));

    return {
      dscr: dscrResult,
      lendingGrade: grade,
      criticalBlockers: blockers,
      completenessPercentage: openTasks.length === 0 ? 100 : Math.round(((tasks.length - openTasks.length) / tasks.length) * 100),
    };
  }, [canonicalFields, observations, activeDeal, tasks]);

  const latestAnalysis = React.useMemo(() => runFinancialAnalysis(), [runFinancialAnalysis]);

  // 6. Create Submission Package (Human-Gated)
  const createSubmissionPackage = (lenderId: string) => {
    const validation = validateSubmissionPreconditions({
      dealId: activeDeal.id,
      lenderId,
      approverRole: activeRole,
      consents,
      tasks,
      canonicalFields,
    });

    if (!validation.canSubmit) {
      const primaryErr = validation.errors[0]?.message || 'Submission preconditions failed.';
      return { success: false, error: primaryErr };
    }

    const snapshot: Submission = {
      id: `sub_${Date.now()}`,
      dealId: activeDeal.id,
      lenderId,
      lenderName: mockLenderPolicy.lenderName,
      approvedById: 'user_broker_sarah',
      approvedByName: 'Sarah Jenkins',
      contentsSnapshot: {
        dealStage: activeDeal.stage,
        canonicalFields,
        documents: documents.map((d) => ({ id: d.id, filename: d.filename, sha256: d.sha256Digest })),
        analysis: latestAnalysis,
        timestamp: new Date().toISOString(),
      },
      deliveryStatus: 'delivered',
      sentAt: new Date().toISOString(),
    };

    setSubmissions((prev) => [snapshot, ...prev]);

    // Advance Stage
    setDeals((prev) =>
      prev.map((d) => (d.id === activeDeal.id ? { ...d, stage: 'submitted' as DealStage } : d))
    );

    eventBus.publish('submission.authorized', mockTenant.id, 'user_broker_sarah', activeRole, {
      dealId: activeDeal.id,
      submissionId: snapshot.id,
      lenderId,
    });

    eventBus.publish('submission.sent', mockTenant.id, 'user_broker_sarah', activeRole, {
      dealId: activeDeal.id,
      submissionId: snapshot.id,
    });

    return { success: true, submission: snapshot };
  };

  // 7. Lender Conditions Update
  const updateConditionStatus = (conditionId: string, status: LenderCondition['status']) => {
    setLenderConditions((prev) =>
      prev.map((c) => (c.id === conditionId ? { ...c, status } : c))
    );

    eventBus.publish('condition.accepted', mockTenant.id, 'user_broker_sarah', activeRole, {
      dealId: activeDeal.id,
      conditionId,
      status,
    });
  };

  // 8. Upload Document Simulation
  const uploadDocument = (filename: string, docType: Document['docType']) => {
    const newDoc: Document = {
      id: `doc_up_${Date.now()}`,
      dealId: activeDeal.id,
      storageKey: `s3://apex-docs/deals/${activeDeal.id}/${filename}`,
      filename,
      sha256Digest: 'f8923a1092830192830192830192830192830192830192830192830192830192',
      uploaderId: 'user_borrower_marcus',
      uploaderRole: activeRole,
      sourceEventId: `evt_web_upload_${Date.now()}`,
      pageCount: 4,
      processingState: 'extracted',
      acceptanceState: 'intake_only',
      docType,
      uploadedAt: new Date().toISOString(),
      ocrTextPreview: `INTAKE DOCUMENT PREVIEW (${docType.toUpperCase()}):\nDocument: ${filename}\nStatus: OCR Processed and Structured Observation Candidates Generated.`,
    };

    setDocuments((prev) => [newDoc, ...prev]);
    setSelectedDocForViewer(newDoc);

    eventBus.publish('document.received', mockTenant.id, 'user_borrower_marcus', activeRole, {
      dealId: activeDeal.id,
      documentId: newDoc.id,
      filename,
    });

    eventBus.publish('document.classified', mockTenant.id, 'system_ocr', 'system', {
      dealId: activeDeal.id,
      documentId: newDoc.id,
      docType,
    });
  };

  return (
    <DealContext.Provider
      value={{
        tenant: mockTenant,
        deals,
        activeDeal,
        activeRole,
        setActiveRole,
        setActiveDealId,
        documents,
        observations,
        canonicalFields,
        requirements,
        tasks,
        policy: mockLenderPolicy,
        consents,
        lenderConditions,
        auditLogs,
        latestAnalysis,
        submissions,
        confirmFieldObservation,
        rejectFieldObservation,
        completeTask,
        waiveRequirement,
        runFinancialAnalysis,
        createSubmissionPackage,
        updateConditionStatus,
        uploadDocument,
        selectedDocForViewer,
        setSelectedDocForViewer,
        highlightedRegion,
        setHighlightedRegion,
      }}
    >
      {children}
    </DealContext.Provider>
  );
};

export const useDealContext = () => {
  const context = useContext(DealContext);
  if (!context) {
    throw new Error('useDealContext must be used within a DealProvider');
  }
  return context;
};
