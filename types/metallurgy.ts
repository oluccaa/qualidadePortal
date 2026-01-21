
import { ID, ISO8601Date } from './common.ts';
import { QualityStatus } from './enums.ts';

export interface ChemicalComposition {
  carbon: number;
  manganese: number;
  silicon: number;
  phosphorus: number;
  sulfur: number;
}

export interface MechanicalProperties {
  yieldStrength: number;
  tensileStrength: number;
  elongation: number;
}

export interface AuditSignature {
  userId: string;
  userName: string;
  userEmail: string; 
  userRole: string;
  timestamp: ISO8601Date;
  action: string;
  ip?: string;
}

export interface FileVersion {
  version: number;
  storagePath: string;
  createdAt: ISO8601Date;
  createdBy: string;
  note?: string;
}

export type AnnotationType = 'pencil' | 'marker' | 'rect' | 'circle' | 'eraser';

export interface NormalizedPoint {
  x: number;
  y: number;
}

export interface AnnotationItem {
  id: string;
  type: AnnotationType;
  color: string;
  lineWidth: number;
  points?: NormalizedPoint[];
  startPoint?: NormalizedPoint;
  endPoint?: NormalizedPoint;
  opacity?: number;
}

export type DocumentAnnotations = Record<number, AnnotationItem[]>;

export interface SteelBatchMetadata {
  batchNumber: string;
  grade: string;
  invoiceNumber: string;
  currentVersion: number;
  versionHistory: FileVersion[];
  currentStep: number;

  viewedAt?: ISO8601Date;
  clientObservations?: string;
  replacementFileId?: string;
  auditStartTime?: ISO8601Date;
  auditDurationSeconds?: number;
  
  signatures: {
    step1_release?: AuditSignature;
    step2_documental?: AuditSignature;
    step3_physical?: AuditSignature;
    step4_arbitrage?: AuditSignature;
    step5_partner_verdict?: AuditSignature;
    step6_consolidation_client?: AuditSignature; // Assinatura do Cliente
    step6_consolidation_quality?: AuditSignature; // Assinatura da Qualidade
    step7_certification?: AuditSignature;
  };

  documentalStatus?: 'APPROVED' | 'REJECTED' | 'PENDING';
  physicalStatus?: 'APPROVED' | 'REJECTED' | 'PENDING';
  
  documentalNotes?: string;
  documentalDrawings?: string; 
  physicalNotes?: string;
  
  documentalFlags?: string[];
  physicalFlags?: string[];
  physicalPhotos?: string[];
  
  status: QualityStatus;
  chemicalComposition: ChemicalComposition;
  mechanicalProperties: MechanicalProperties;
  rejectionReason?: string;
  inspectedAt?: ISO8601Date;
  inspectedBy?: string;
}
