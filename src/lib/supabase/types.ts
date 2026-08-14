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
}

export type Database = {
  public: {
    Tables: {
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
