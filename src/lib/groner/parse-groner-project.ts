import { Obra } from '../supabase/types';

/**
 * Função para mapear e planificar o payload da API do Groner.
 * @param rawData - O objeto retornado pela chamada GET /api/Projeto/{id}
 * @returns Dicionário consolidado com as variáveis do cliente tipado como Obra.
 */
export function parseGronerProject(rawData: any): Obra {
  // Isola a raiz do conteúdo válido
  const p = rawData?.Content || {};
  
  // Tratamento de nós que podem vir nulos
  const lead = p.lead || {};
  const end = p.endereco || {};
  const prop = p.prePropostaAceita?.preProposta || {};
  const sim = prop.simulacao || {};

  // Extração avançada: A marca do módulo fica encapsulada como string JSON no Groner
  let marcaModulo = "Não informada";
  if (sim.descricaoTecnicaModulo) {
    try {
      const descTecnica = JSON.parse(sim.descricaoTecnicaModulo);
      marcaModulo = descTecnica.MarcaModulo || "Não informada";
    } catch (e) {
      console.error("Falha ao fazer o parse de descricaoTecnicaModulo", e);
    }
  }

  // Tratamento do responsável/instalador
  const instalador = p.tecnico?.nome || p.vendedorResponsavel?.nome || "Não atribuído";

  const obraFormatada: Obra = {
    id_obra: Number(p.id) || 0,
    status: p.status?.nome || "Sem status",
    cliente: lead.nome || "Nome não cadastrado",
    telefone: lead.celular || "Sem telefone",
    cidade: end.cidade || "Sem cidade",
    endereco: end.logradouro 
      ? `${end.logradouro}, ${end.numero || "S/N"} - ${end.bairro || ""} (CEP: ${end.cep || ""})` 
      : "Endereço não cadastrado",
    link_maps: (p.latitude && p.longitude) 
      ? `https://www.google.com/maps?q=${p.latitude},${p.longitude}` 
      : "Coordenadas ausentes",
    data_instalacao: p.dataUltimoStatus || "Não definida",
    instalador: instalador,
    tipo_ligacao: p.faseEnergetica || "Não definida",
    tipo_telhado: p.tipoTelhado?.nome || "Não definido",
    
    // Equipamentos
    inversor_marca: sim.inversor ? sim.inversor.split(" ")[0] : "Não informada",
    inversor_modelo: sim.inversor || "Não informado",
    potencia_inversor_kw: Number(sim.potenciaInversor) || 0,
    modulos_marca: marcaModulo,
    modulos_modelo: sim.placaNome || "Não informado",
    potencia_modulo_w: Number(sim.placaPotencia) || 0,
    qtd_modulos: Number(sim.quantidadePlacas) || 0,
    potencia_total_kwp: Number(sim.kwP) || 0,
    
    // Extras
    observacoes: p.descricao || "",
    link_fotos: p.imagemContaEnergia?.url || "",
  };

  return obraFormatada;
}
