export type AppRole = 'instalador' | 'escritorio' | 'admin';

export interface Perfil {
  id: string;
  email: string;
  nome_completo?: string | null;
  role: AppRole;
  created_at?: string;
}

export interface Obra {
  id?: string;
  created_at?: string;
  id_obra: number;
  cliente: string;
  status: string;
  telefone: string;
  cidade: string;
  endereco: string;
  link_maps: string;
  data_instalacao: string;
  instalador: string;
  tipo_ligacao: string;
  tipo_telhado: string;
  inversor_marca: string;
  inversor_modelo: string;
  potencia_inversor_kw: number;
  modulos_marca: string;
  modulos_modelo: string;
  potencia_modulo_w: number;
  qtd_modulos: number;
  potencia_total_kwp: number;
  observacoes: string;
  link_fotos: string;
}

export const PROJECT_SUBCATEGORIES = [
  { id: 'fachada', label: 'Fachada', icon: 'Building2', appSheetField: 'CampoFotodafachadaProjeto' },
  { id: 'padrao_entrada', label: 'Padrão de Entrada', icon: 'Zap', appSheetField: 'CampoFotodopadrodeentradaProjeto' },
  { id: 'medidor', label: 'Medidor', icon: 'Gauge', appSheetField: 'CampoFotodomedidorProjeto' },
  { id: 'disjuntor_geral', label: 'Disjuntor Geral', icon: 'Power', appSheetField: 'CampoFotododisjuntorgeralProjeto' },
  { id: 'qdc', label: 'QDC', icon: 'Box', appSheetField: 'CampoFotodoQDCProjeto' },
  { id: 'ramal_entrada', label: 'Ramal de Entrada', icon: 'Cable', appSheetField: 'CampoFotodoramaldeentradaProjeto' },
  { id: 'local_inversor', label: 'Local do Inversor', icon: 'Cpu', appSheetField: 'CampoFotodolocaldoinversorProjeto' },
  { id: 'telhado', label: 'Telhado', icon: 'Home', appSheetField: 'CampoFotosdotelhadoProjeto' },
  { id: 'drone', label: 'Drone', icon: 'Plane', appSheetField: 'CampoFotosdedroneProjeto' },
  { id: 'geral', label: 'Geral', icon: 'Folder', appSheetField: '' },
] as const;

export type ProjectSubcategoryId = typeof PROJECT_SUBCATEGORIES[number]['id'];

export interface ObraPhoto {
  id: string;
  created_at: string;
  id_obra: number;
  storage_path: string;
  file_name?: string;
  content_type?: string;
  size_bytes?: number;
  public_url: string;
  category?: 'registro' | 'projeto' | string;
  subcategory?: ProjectSubcategoryId | string;
}

export type Database = {
  public: {
    Tables: {
      perfis: {
        Row: Perfil;
        Insert: Omit<Perfil, 'created_at'>;
        Update: Partial<Omit<Perfil, 'id' | 'created_at'>>;
      };
      obras: {
        Row: Obra;
        Insert: Omit<Obra, 'id' | 'created_at'>;
        Update: Partial<Omit<Obra, 'id' | 'created_at'>>;
      };
      obra_photos: {
        Row: ObraPhoto;
        Insert: Omit<ObraPhoto, 'id' | 'created_at'>;
        Update: Partial<Omit<ObraPhoto, 'id' | 'created_at'>>;
      };
    };
  };
};
