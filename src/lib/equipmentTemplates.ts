import { EquipmentAttribute } from '../types';

export interface EquipmentTemplate {
  label: string;
  fields: Record<string, EquipmentAttribute>;
}

export const EQUIPMENT_TYPES = [
  'Escavadeira Hidráulica',
  'Caminhão Basculante',
  'Pá Carregadeira',
  'Motoniveladora',
  'Rolo Compactador',
  'Trator de Esteira',
  'Retroescavadeira',
  'Caminhão Pipa',
  'Caminhão Munck',
  'Veículo Leve',
  'Drone',
  'Gerador',
  'Ferramenta Elétrica',
  'Equipamento Topográfico'
];

export const EQUIPMENT_TEMPLATES: Record<string, EquipmentTemplate> = {
  'Escavadeira Hidráulica': {
    label: 'Escavadeira',
    fields: {
      'combustivel': { type: 'select', value: 'Diesel', options: ['Diesel', 'Diesel S10', 'Elétrico'] },
      'potencia': { type: 'text', value: '' },
      'peso_operacional': { type: 'number', value: 0 },
      'capacidade_concha': { type: 'text', value: '' },
      'rastreador': { type: 'boolean', value: false }
    }
  },
  'Caminhão Basculante': {
    label: 'Caminhão',
    fields: {
      'combustivel': { type: 'select', value: 'Diesel S10', options: ['Diesel', 'Diesel S10'] },
      'tracao': { type: 'select', value: '6x4', options: ['4x2', '4x4', '6x2', '6x4', '8x4'] },
      'capacidade_carga': { type: 'text', value: '' },
      'eixos': { type: 'number', value: 3 },
      'rastreador': { type: 'boolean', value: true }
    }
  },
  'Drone': {
    label: 'Drone',
    fields: {
      'rtk': { type: 'boolean', value: true },
      'autonomia_min': { type: 'number', value: 30 },
      'camera': { type: 'text', value: '4K' },
      'alcance_km': { type: 'number', value: 5 }
    }
  },
  'Veículo Leve': {
    label: 'Carro/Pick-up',
    fields: {
      'combustivel': { type: 'select', value: 'Flex', options: ['Gasolina', 'Álcool', 'Flex', 'Diesel', 'Elétrico'] },
      'transmissao': { type: 'select', value: 'Manual', options: ['Manual', 'Automático'] },
      'ar_condicionado': { type: 'boolean', value: true }
    }
  },
  'Gerador': {
    label: 'Gerador',
    fields: {
      'potencia_kva': { type: 'number', value: 0 },
      'combustivel': { type: 'select', value: 'Diesel', options: ['Diesel', 'Gasolina'] },
      'tensao': { type: 'multi-select', value: ['220V'], options: ['110V', '220V', '380V', '440V'] }
    }
  }
};
