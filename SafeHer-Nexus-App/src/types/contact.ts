export interface EmergencyContact {
  id: number;
  name: string;
  phoneNumber: string;
  relationship: string;
  email?: string | null;
  primaryContact: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmergencyContactPayload {
  name: string;
  phoneNumber: string;
  relationship: string;
  email?: string;
  primaryContact: boolean;
}

export const MAX_CONTACTS_LIMIT = 5;
