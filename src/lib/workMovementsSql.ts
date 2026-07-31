import { WorkMovement } from '../types';

export const WORK_MOVEMENTS_SQL_SCRIPT = `-- ====================================================================
-- TABELA DE MOVIMENTAÇÃO DA OBRA (WORK MOVEMENTS)
-- Registra todas as ações automatizadas e manuais de todos os setores
-- (RH, ALMOXARIFE, COMPRAS, FINANCEIRO, SALA TÉCNICA, CONTROLADOR)
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.work_movements (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    company_id VARCHAR(255),
    contract_id VARCHAR(255),
    contract_name VARCHAR(255),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    sector VARCHAR(50) NOT NULL CHECK (sector IN ('RH', 'ALMOXARIFE', 'COMPRAS', 'FINANCEIRO', 'SALA TÉCNICA', 'CONTROLADOR')),
    action VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    responsible_user VARCHAR(255) NOT NULL,
    reference_code VARCHAR(100),
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para otimização de busca e relatórios
CREATE INDEX IF NOT EXISTS idx_work_movements_company ON public.work_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_work_movements_sector ON public.work_movements(sector);
CREATE INDEX IF NOT EXISTS idx_work_movements_action ON public.work_movements(action);
CREATE INDEX IF NOT EXISTS idx_work_movements_timestamp ON public.work_movements(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_work_movements_ref_code ON public.work_movements(reference_code);

-- Trigger de atualização automatizada de updated_at
CREATE OR REPLACE FUNCTION update_work_movements_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_work_movements_timestamp ON public.work_movements;
CREATE TRIGGER trg_update_work_movements_timestamp
    BEFORE UPDATE ON public.work_movements
    FOR EACH ROW
    EXECUTE FUNCTION update_work_movements_timestamp();

-- Políticas de Segurança RLS (Row Level Security - Supabase)
ALTER TABLE public.work_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir acesso de leitura para usuários autenticados"
    ON public.work_movements FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Permitir inserção para usuários autenticados"
    ON public.work_movements FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Documentação do Schema
COMMENT ON TABLE public.work_movements IS 'Registro centralizado de movimentações e eventos operacionais de todos os setores da obra.';
COMMENT ON COLUMN public.work_movements.sector IS 'Setor responsável: RH, ALMOXARIFE, COMPRAS, FINANCEIRO, SALA TÉCNICA, CONTROLADOR';
COMMENT ON COLUMN public.work_movements.action IS 'Ação registrada (ex: ADMISSÃO DE COLABORADOR, ENTRADA DE MATERIAL, etc.)';
COMMENT ON COLUMN public.work_movements.details IS 'Atributos detalhados em JSON contendo valores, quantidades, nomes, observações e comprovantes';
`;

export const INITIAL_WORK_MOVEMENTS: WorkMovement[] = [
  // 1. RH
  {
    id: 'wm-rh-01',
    timestamp: '2026-07-31T08:30:00.000Z',
    sector: 'RH',
    action: 'ADMISSÃO DE COLABORADOR',
    description: 'Admissão de novo Pedreiro de Alvenaria para a Frente 01.',
    responsibleUser: 'Carlos Eduardo (Gestão RH)',
    referenceCode: 'RH-ADM-2026-089',
    details: {
      collaboratorName: 'João Pedro da Silva',
      collaboratorRole: 'Pedreiro de Alvenaria',
      collaboratorCpf: '123.456.789-00',
      amount: 3200.00,
      unit: 'mês',
      status: 'Ativo / Em DSR',
      notes: 'Documentação validada pelo departamento pessoal. Exame admissional ASO Aprovado.'
    }
  },
  {
    id: 'wm-rh-02',
    timestamp: '2026-07-30T17:15:00.000Z',
    sector: 'RH',
    action: 'DEMISSÃO DE COLABORADOR',
    description: 'Rescisão contratual a pedido do colaborador.',
    responsibleUser: 'Carlos Eduardo (Gestão RH)',
    referenceCode: 'RH-DEM-2026-014',
    details: {
      collaboratorName: 'Marcos Antonio Souza',
      collaboratorRole: 'Servente de Obras',
      collaboratorCpf: '987.654.321-11',
      status: 'Desligado',
      notes: 'Exame demissional realizado. Quitação de haveres e devolução de EPIs confirmada.'
    }
  },
  {
    id: 'wm-rh-03',
    timestamp: '2026-07-30T10:00:00.000Z',
    sector: 'RH',
    action: 'TRANSFERÊNCIA DE COLABORADOR',
    description: 'Transferência de operador de escavadeira da Obra Sul para Obra Norte.',
    responsibleUser: 'Fernanda Lima (RH Operacional)',
    referenceCode: 'RH-TRF-2026-033',
    details: {
      collaboratorName: 'Raimundo Nonato',
      collaboratorRole: 'Operador de Escavadeira Hidráulica',
      origin: 'Lote 01 - Pavimentação Sul',
      destination: 'Lote 02 - Terraplenagem Norte',
      status: 'Concluída',
      notes: 'Deslocamento acompanhado de vale-transporte e alojamento atualizado.'
    }
  },
  {
    id: 'wm-rh-04',
    timestamp: '2026-07-29T18:00:00.000Z',
    sector: 'RH',
    action: 'FECHAMENTO DE JORNADA',
    description: 'Fechamento do espelho de ponto e apropriação do efetivo da semana 30.',
    responsibleUser: 'Fernanda Lima (RH Operacional)',
    referenceCode: 'RH-JRN-2026-W30',
    details: {
      quantity: 42,
      unit: 'colaboradores',
      hoursOrHorometer: 1848,
      status: 'Aprovado pelo Eng. Residente',
      notes: 'Sem divergências nas horas extras apontadas no RDO.'
    }
  },

  // 2. ALMOXARIFE
  {
    id: 'wm-alm-01',
    timestamp: '2026-07-31T09:10:00.000Z',
    sector: 'ALMOXARIFE',
    action: 'SOLICITAÇÃO DE MATERIAL',
    description: 'Requisição urgente de Cimento CP II Z-32 para concretagem da canaleta.',
    responsibleUser: 'Roberto Martins (Almoxarife chefe)',
    referenceCode: 'SOL-MAT-2026-102',
    details: {
      materialName: 'Cimento Portland CP II Z-32 (Saco 50kg)',
      quantity: 150,
      unit: 'sacos',
      destination: 'Frente 02 - Drenagem',
      status: 'Aguardando Aprovação de Compras',
      notes: 'Estoque mínimo atingido. Necessário para lançamento programado na sexta-feira.'
    }
  },
  {
    id: 'wm-alm-02',
    timestamp: '2026-07-30T14:20:00.000Z',
    sector: 'ALMOXARIFE',
    action: 'ENTRADA DE MATERIAL',
    description: 'Recebimento de lote de aço CA-50 10mm com Nota Fiscal.',
    responsibleUser: 'Roberto Martins (Almoxarife chefe)',
    referenceCode: 'NF-104928',
    details: {
      materialName: 'Aço Vergalhão CA-50 10.0mm (Barra 12m)',
      quantity: 5000,
      unit: 'kg',
      supplier: 'Gerdau Aços Longos S.A.',
      invoiceNumber: '104928-1',
      amount: 28500.00,
      status: 'Inspecionado e Armazenado',
      notes: 'Ensaio de tração e certificado de qualidade conferidos na portaria.'
    }
  },
  {
    id: 'wm-alm-03',
    timestamp: '2026-07-30T08:15:00.000Z',
    sector: 'ALMOXARIFE',
    action: 'SAÍDA DE MATERIAL',
    description: 'Baixa de tubos PEAD para equipe de saneamento.',
    responsibleUser: 'Luciano Silva (Almoxarife)',
    referenceCode: 'SAI-MAT-2026-311',
    details: {
      materialName: 'Tubo Corrugado PEAD DN 400mm',
      quantity: 120,
      unit: 'metros',
      destination: 'Equipe de Drenagem Profunda - Estaca 140',
      status: 'Entregue em Canteiro',
      notes: 'Retirado por Encarregado Paulo Viana.'
    }
  },
  {
    id: 'wm-alm-04',
    timestamp: '2026-07-29T16:40:00.000Z',
    sector: 'ALMOXARIFE',
    action: 'ATUALIZAÇÃO DE ESTOQUE',
    description: 'Inventário físico quinzenal e ajuste de divergências de cal em pó.',
    responsibleUser: 'Roberto Martins (Almoxarife chefe)',
    referenceCode: 'INV-2026-07B',
    details: {
      materialName: 'Cal Hidratada CH-I',
      quantity: 450,
      unit: 'sacos',
      status: 'Inventário Concluído',
      notes: 'Ajuste de -10 sacos por avaria durante intempéries no depósito temporário.'
    }
  },

  // 3. COMPRAS
  {
    id: 'wm-cmp-01',
    timestamp: '2026-07-31T07:45:00.000Z',
    sector: 'COMPRAS',
    action: 'COTAÇÃO APROVADA',
    description: 'Aprovação da cotação de locação de rolo compactador pé de carneiro.',
    responsibleUser: 'Juliana Paes (Compradora)',
    referenceCode: 'COT-2026-0044',
    details: {
      materialName: 'Locação Rolo Compactador PPD 115hp',
      supplier: 'Sotreq Equipamentos S.A.',
      amount: 18500.00,
      unit: 'mês',
      status: 'Aprovada pelo Administrador da Obra',
      notes: 'Inclui manutenção preventiva e operador qualificado.'
    }
  },
  {
    id: 'wm-cmp-02',
    timestamp: '2026-07-29T11:30:00.000Z',
    sector: 'COMPRAS',
    action: 'COMPRA EFETUADA',
    description: 'Emissão de Pedido de Compra de emulsão asfáltica RR-2C.',
    responsibleUser: 'Juliana Paes (Compradora)',
    referenceCode: 'PC-2026-0581',
    details: {
      materialName: 'Emulsão Asfáltica de Ruptura Rápida RR-2C',
      quantity: 18,
      unit: 'toneladas',
      supplier: 'Greca Asfaltos Ltda.',
      amount: 64800.00,
      status: 'Pedido Emitido / Entrega agendada 03/08',
      notes: 'Condição de pagamento: 30/60 dias via boleto bancário.'
    }
  },

  // 4. FINANCEIRO
  {
    id: 'wm-fin-01',
    timestamp: '2026-07-30T16:00:00.000Z',
    sector: 'FINANCEIRO',
    action: 'MOVIMENTAÇÃO DE CAIXA',
    description: 'Pagamento de despesas de pequeno porte do canteiro (fundo fixo).',
    responsibleUser: 'Beatriz Castro (Financeiro Canteiro)',
    referenceCode: 'CX-2026-07-30',
    details: {
      amount: 1450.80,
      status: 'Baixado no Caixinha',
      notes: 'Pagamento de abastecimento emergencial e refeições de turno extraordinário.'
    }
  },
  {
    id: 'wm-fin-02',
    timestamp: '2026-07-28T15:00:00.000Z',
    sector: 'FINANCEIRO',
    action: 'FECHAMENTO DE APORTE',
    description: 'Consolidação e conciliação do aporte quinzenal da matriz para folha e suprimentos.',
    responsibleUser: 'Beatriz Castro (Financeiro Canteiro)',
    referenceCode: 'APT-2026-14',
    details: {
      amount: 250000.00,
      origin: 'Matriz - Conta Corrente Principal',
      destination: 'Subconta Obra Trecho Sul',
      status: 'Conciliado',
      notes: 'Aporte recebido e auditado com saldo prévio regularizado.'
    }
  },

  // 5. SALA TÉCNICA
  {
    id: 'wm-tec-01',
    timestamp: '2026-07-31T08:00:00.000Z',
    sector: 'SALA TÉCNICA',
    action: 'PRODUÇÃO ATUALIZADA',
    description: 'Apontamento do volume diário de escavação e aterro no RDO.',
    responsibleUser: 'Eng. Marcelo Nogueira (Sala Técnica)',
    referenceCode: 'RDO-2026-07-30',
    details: {
      productionValue: 1240.00,
      unit: 'm³',
      progressPercentage: 68.5,
      status: 'Aprovado na Fiscalização',
      notes: 'Executado aterro compactado na estaca 220+00 a 235+00 conforme projeto.'
    }
  },
  {
    id: 'wm-tec-02',
    timestamp: '2026-07-29T09:30:00.000Z',
    sector: 'SALA TÉCNICA',
    action: 'CRONOGRAMA ATUALIZADO',
    description: 'Revisão da linha de balanço e reprogramação da pavimentação asfáltica.',
    responsibleUser: 'Eng. Marcelo Nogueira (Sala Técnica)',
    referenceCode: 'CRN-REV-04',
    details: {
      progressPercentage: 74.2,
      status: 'Baseline Atualizada',
      notes: 'Ajustado sequenciamento de sub-base devido a antecipação da drenagem superficial.'
    }
  },
  {
    id: 'wm-tec-03',
    timestamp: '2026-07-28T17:30:00.000Z',
    sector: 'SALA TÉCNICA',
    action: 'MEDIÇÃO ENCERRADA',
    description: 'Fechamento do boletim da 07ª Medição Contratual junto ao cliente.',
    responsibleUser: 'Eng. Marcelo Nogueira (Sala Técnica)',
    referenceCode: 'MED-007-JUL26',
    details: {
      amount: 485900.25,
      progressPercentage: 100,
      status: 'Assinada e Enviada para Faturamento',
      notes: 'Inclui memória de cálculo, relatório fotográfico e ensaios de deflectometria.'
    }
  },

  // 6. CONTROLADOR
  {
    id: 'wm-ctl-01',
    timestamp: '2026-07-31T07:00:00.000Z',
    sector: 'CONTROLADOR',
    action: 'ENTRADA DE EQUIPAMENTO',
    description: 'Chegada de caminhão basculante 14m³ contratado para transporte de solo.',
    responsibleUser: 'Gerson Santos (Controlador da Frota)',
    referenceCode: 'EQP-ENT-2026-019',
    details: {
      equipmentCode: 'CAM-BAS-08',
      equipmentName: 'Caminhão Basculante Volvo FMX 440 (6x4)',
      hoursOrHorometer: 4210,
      origin: 'Locadora TransTerra',
      status: 'Vistoriado e Aprovado',
      notes: 'Checklist de segurança 100% ok. Documentação de tráfego e tacógrafo auditados.'
    }
  },
  {
    id: 'wm-ctl-02',
    timestamp: '2026-07-30T16:30:00.000Z',
    sector: 'CONTROLADOR',
    action: 'SAÍDA DE EQUIPAMENTO',
    description: 'Desmobilização de pá carregadeira ao término da fase de escavação.',
    responsibleUser: 'Gerson Santos (Controlador da Frota)',
    referenceCode: 'EQP-SAI-2026-012',
    details: {
      equipmentCode: 'PAC-CAT-03',
      equipmentName: 'Pá Carregadeira Caterpillar 924K',
      hoursOrHorometer: 8950,
      destination: 'Patio Central da Empresa',
      status: 'Desmobilizado',
      notes: 'Horímetro final registrado. Liberação autorizada pelo encarregado de equipamentos.'
    }
  },
  {
    id: 'wm-ctl-03',
    timestamp: '2026-07-30T11:00:00.000Z',
    sector: 'CONTROLADOR',
    action: 'TRANSFERÊNCIA DE EQUIPAMENTO',
    description: 'Transferência de motoniveladora para apoio à frente de regularização.',
    responsibleUser: 'Gerson Santos (Controlador da Frota)',
    referenceCode: 'EQP-TRF-2026-007',
    details: {
      equipmentCode: 'MOT-CAT-01',
      equipmentName: 'Motoniveladora Caterpillar 140K',
      origin: 'Trecho km 12',
      destination: 'Trecho km 28 (Frente de Regularização)',
      status: 'Em Trânsito / Prancha transportadora',
      notes: 'Início do transporte via prancha às 11:15h.'
    }
  },
  {
    id: 'wm-ctl-04',
    timestamp: '2026-07-29T13:15:00.000Z',
    sector: 'CONTROLADOR',
    action: 'EQUIPAMENTO EM MANUTENÇÃO',
    description: 'Paralisação para troca preventiva de óleo e filtros da escavadeira.',
    responsibleUser: 'Gerson Santos (Controlador da Frota)',
    referenceCode: 'MNT-2026-094',
    details: {
      equipmentCode: 'ESC-HYU-02',
      equipmentName: 'Escavadeira Hidráulica Hyundai R220LC-9SB',
      hoursOrHorometer: 2500,
      status: 'Em Manutenção Preventiva em Oficina de Canteiro',
      notes: 'Previsão de retorno de 3 horas. Troca de óleo hidráulico e elemento filtrante.'
    }
  },
  {
    id: 'wm-ctl-05',
    timestamp: '2026-07-28T18:00:00.000Z',
    sector: 'CONTROLADOR',
    action: 'MEDIÇÃO EQUIPAMENTO',
    description: 'Fechamento da medição de horímetro e horas produtivas da frota pesada.',
    responsibleUser: 'Gerson Santos (Controlador da Frota)',
    referenceCode: 'MED-EQP-2026-07',
    details: {
      hoursOrHorometer: 340,
      quantity: 14,
      unit: 'equipamentos',
      amount: 112400.00,
      status: 'Aprovada pelo Controle Operacional',
      notes: 'Medição mensal consolidada sem divergências em relação aos boletins diários.'
    }
  }
];
