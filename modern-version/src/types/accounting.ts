export type Currency = 'UZS' | 'USD';
export type PaymentType = 'CASH' | 'PLASTIC' | 'BANK' | 'DEBT';

export interface LegalEntity {
  id: string;
  name: string;
  created_at: string;
}

export interface BankAccount {
  id: string;
  entity_id: string;
  account_name: string;
  bank_name: string;
  mfo: string;
  account_number: string;
  balance: number;
  created_at: string;
}

export interface PlasticCard {
  id: string;
  account_id: string;
  card_number: string; // 16 digits
  bank_name: string;
  balance: number;
  created_at: string;
}

export interface Partner {
  id: string;
  name: string;
  logo_url?: string;
  address?: string;
  phones?: string[];
  balance: number;
  created_at: string;
}

export interface AccountingTransaction {
  id: string;
  date: string;
  description: string;
  sender_type: 'ENTITY' | 'PARTNER' | 'CASH' | 'BANK' | 'PLASTIC';
  sender_id?: string;
  receiver_type: 'ENTITY' | 'PARTNER' | 'CASH' | 'BANK' | 'PLASTIC';
  receiver_id?: string;
  currency: Currency;
  exchange_rate: number; // 1 if UZS
  amount_original: number;
  amount_uzs: number;
  payment_type: PaymentType;
  attachment_url?: string;
  created_at: string;
}

export interface Debt {
  id: string;
  partner_id: string;
  transaction_id: string;
  amount_total: number;
  amount_paid: number;
  amount_remaining: number;
  terms_days: number;
  due_date: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  created_at: string;
}
