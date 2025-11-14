
export interface FieldsConfidence {
  member_id: number;
  remark_raw: number;
}

export interface KycData {
  date: string | null;
  auditor: string | null;
  member_id: string | null;
  name: string | null;
  remark_raw: string;
  remark_normalized: string;
  kyc_status: string;
  confidence: number;
  fields_confidence: FieldsConfidence;
  notes: string;
  csv_row: string;
  accountStatusCsvRow: string;
  manualFreezeCsvRow: string;
}

export interface IdCardData {
  name: string | null;
  dateOfBirth: string | null;
  idNumber: string | null;
  dateOfExpiry: string | null;
  isExpired?: boolean;
  isUnderage?: boolean;
}