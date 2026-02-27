export type UserRole = "demandeur" | "gdr" | "admin";

export type TicketType = "creation" | "enrichissement" | "creation_enrichissement";

export type TicketStatus = "envoye" | "recu" | "en_cours" | "en_attente" | "termine";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Ticket {
  id: number;
  reference: string;
  type: TicketType;
  status: TicketStatus;
  urgent: boolean;
  urgent_reason: string | null;
  demandeur_id: string;
  gdr_id: string | null;
  created_at: string;
  closed_at: string | null;
}

export interface ArticleLine {
  id: number;
  ticket_id: number;
  nom_fournisseur: string;
  marque: string;
  ref_info: string;
  ean: string;
  ref_com: string;
  designation: string;
  tarif: number | null;
  codag_attribue: string | null;
}

export interface Attachment {
  id: number;
  ticket_id: number;
  file_name: string;
  file_url: string;
  uploaded_at: string;
}

export interface Comment {
  id: number;
  ticket_id: number;
  author_id: string;
  content: string;
  created_at: string;
}

