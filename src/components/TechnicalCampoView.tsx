import React, { useState, useMemo } from 'react';
import { 
  Smartphone, CheckCircle2, XCircle, Clock, Search, Edit3, 
  Check, X, Eye, Filter, Calendar, MapPin, UserCheck, HardHat, 
  AlertCircle, ChevronDown, RefreshCw, FileText, Camera, Trash2
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Contract, ServiceItem, ServiceProduction, FieldProductionReport } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface TechnicalCampoViewProps {
  contract: Contract;
  fieldReports: FieldProductionReport[];
  services: ServiceItem[];
  serviceProductions: ServiceProduction[];
  onApproveReport: (reportId: string, approvedBy: string, editedData?: Partial<FieldProductionReport>) => Promise<boolean> | void;
  onRejectReport: (reportId: string, rejectedBy: string, reason?: string) => Promise<boolean> | void;
  onEditReport: (report: FieldProductionReport) => Promise<boolean> | void;
  onDeleteReport?: (reportId: string) => Promise<boolean> | void;
}

export function TechnicalCampoView({
  contract,
  fieldReports,
  services,
  serviceProductions,
  onApproveReport,
  onRejectReport,
  onEditReport,
  onDeleteReport,
}: TechnicalCampoViewProps) {
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Selected report for modal operations
  const [editingReport, setEditingReport] = useState<FieldProductionReport | null>(null);
  const [rejectingReport, setRejectingReport] = useState<FieldProductionReport | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [viewingPhotoUrl, setViewingPhotoUrl] = useState<string | null>(null);

  // Edit form states
  const [editServiceId, setEditServiceId] = useState<string>('');
  const [editQty, setEditQty] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editTrecho, setEditTrecho] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');

  // Processing & Feedback modal states
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingMessage, setProcessingMessage] = useState<string>('');
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  // Filter reports for current contract with resilient matching (by ID, Code, Name or WorkName)
  const contractReports = useMemo(() => {
    if (!contract) return [];
    
    const cleanId = (contract.id || '').toString().trim().toLowerCase();
    const cleanCode = (contract.code || '').toString().trim().toLowerCase();
    const cleanName = (contract.name || (contract as any).workName || '').toString().trim().toLowerCase();

    return fieldReports.filter(r => {
      if (!r) return false;
      const rContractId = (r.contractId || '').toString().trim().toLowerCase();
      const rContractName = (r.contractName || '').toString().trim().toLowerCase();

      // Explicit match by ID
      if (cleanId && rContractId && rContractId === cleanId) return true;
      
      // Match by Contract Code
      if (cleanCode && rContractId && rContractId === cleanCode) return true;

      // Match by Contract Name / WorkName
      if (cleanName && (rContractName && (rContractName === cleanName || rContractId === cleanName))) return true;

      // If report has no contractId and no contractName specified at all
      if (!rContractId && !rContractName) return true;

      return false;
    });
  }, [fieldReports, contract]);

  const isPendingReport = (status?: string) => !status || status === 'pending' || status === 'synced';

  const filteredReports = useMemo(() => {
    return contractReports.filter(r => {
      let matchesStatus = true;
      if (filterStatus === 'pending') {
        matchesStatus = isPendingReport(r.status);
      } else if (filterStatus === 'approved') {
        matchesStatus = r.status === 'approved';
      } else if (filterStatus === 'rejected') {
        matchesStatus = r.status === 'rejected';
      }

      const lowerQ = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery.trim() || 
        (r.serviceName || '').toLowerCase().includes(lowerQ) ||
        (r.reportedBy || '').toLowerCase().includes(lowerQ) ||
        (r.trecho && r.trecho.toLowerCase().includes(lowerQ)) ||
        (r.notes && r.notes.toLowerCase().includes(lowerQ));
      
      return matchesStatus && matchesSearch;
    });
  }, [contractReports, filterStatus, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = contractReports.length;
    const pending = contractReports.filter(r => isPendingReport(r.status)).length;
    const approved = contractReports.filter(r => r.status === 'approved').length;
    const rejected = contractReports.filter(r => r.status === 'rejected').length;
    return { total, pending, approved, rejected };
  }, [contractReports]);

  // Open Edit Modal
  const handleOpenEdit = (report: FieldProductionReport) => {
    setEditingReport(report);
    setEditServiceId(report.serviceId);
    setEditQty(report.qty.toString());
    setEditDate(report.productionDate);
    setEditTrecho(report.trecho || '');
    setEditNotes(report.notes || '');
  };

  // Save Edit Changes
  const handleSaveEdit = async () => {
    if (!editingReport) return;
    const parsedQty = parseFloat(editQty);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      alert('Informe uma quantidade válida.');
      return;
    }

    const selectedService = services.find(s => s.id === editServiceId);

    const updated: FieldProductionReport = {
      ...editingReport,
      serviceId: editServiceId,
      serviceName: selectedService?.name || editingReport.serviceName,
      unit: selectedService?.unit || editingReport.unit,
      qty: parsedQty,
      productionDate: editDate,
      trecho: editTrecho,
      notes: editNotes,
    };

    setIsProcessing(true);
    setProcessingMessage('Atualizando e gravando alterações no banco de dados...');
    try {
      await onEditReport(updated);
      setEditingReport(null);
      setFeedbackModal({
        isOpen: true,
        type: 'success',
        title: 'Edição Gravada no Banco de Dados!',
        message: 'As alterações no registro de campo foram salvas e sincronizadas com sucesso no banco de dados.'
      });
    } catch (err: any) {
      setFeedbackModal({
        isOpen: true,
        type: 'error',
        title: 'Erro ao Salvar no Banco',
        message: err?.message || 'Não foi possível gravar as alterações no banco de dados. Tente novamente.'
      });
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
    }
  };

  // Save Edit Changes & Approve Immediately
  const handleSaveAndApprove = async () => {
    if (!editingReport) return;
    const parsedQty = parseFloat(editQty);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      alert('Informe uma quantidade válida.');
      return;
    }

    const selectedService = services.find(s => s.id === editServiceId);

    const updated: FieldProductionReport = {
      ...editingReport,
      serviceId: editServiceId,
      serviceName: selectedService?.name || editingReport.serviceName,
      unit: selectedService?.unit || editingReport.unit,
      qty: parsedQty,
      productionDate: editDate,
      trecho: editTrecho,
      notes: editNotes,
    };

    setIsProcessing(true);
    setProcessingMessage('Aprovando e atualizando saldo no banco de dados...');
    try {
      await onApproveReport(editingReport.id, 'Engenheiro da Sala Técnica', updated);
      setEditingReport(null);
      setFeedbackModal({
        isOpen: true,
        type: 'success',
        title: 'Apontamento Aprovado e Gravado no Banco!',
        message: 'O registro foi aprovado com sucesso! Os quantitativos e o saldo de produção do serviço foram atualizados no banco de dados.'
      });
    } catch (err: any) {
      setFeedbackModal({
        isOpen: true,
        type: 'error',
        title: 'Erro na Aprovação',
        message: err?.message || 'Falha ao confirmar aprovação no banco de dados.'
      });
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
    }
  };

  // Direct Approve
  const handleDirectApprove = async (reportId: string) => {
    setIsProcessing(true);
    setProcessingMessage('Aprovando e consolidando no banco de dados...');
    try {
      await onApproveReport(reportId, 'Engenheiro da Sala Técnica');
      setFeedbackModal({
        isOpen: true,
        type: 'success',
        title: 'Apontamento Aprovado no Banco de Dados!',
        message: 'O registro foi aprovado com sucesso! Os quantitativos do serviço foram atualizados e salvos no banco de dados.'
      });
    } catch (err: any) {
      setFeedbackModal({
        isOpen: true,
        type: 'error',
        title: 'Erro na Aprovação',
        message: err?.message || 'Ocorreu um erro ao gravar a aprovação no banco de dados.'
      });
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
    }
  };

  // Confirm Reject
  const handleConfirmReject = async () => {
    if (!rejectingReport) return;
    if (!rejectReason.trim()) {
      alert('Informe o motivo da rejeição.');
      return;
    }
    const reportId = rejectingReport.id;
    setIsProcessing(true);
    setProcessingMessage('Registrando rejeição no banco de dados...');
    try {
      await onRejectReport(reportId, 'Sala Técnica / Engenharia', rejectReason);
      setRejectingReport(null);
      setRejectReason('');
      setFeedbackModal({
        isOpen: true,
        type: 'success',
        title: 'Rejeição Registrada no Banco de Dados!',
        message: 'O registro foi rejeitado com sucesso e a atualização foi confirmada no banco de dados.'
      });
    } catch (err: any) {
      setFeedbackModal({
        isOpen: true,
        type: 'error',
        title: 'Erro ao Rejeitar',
        message: err?.message || 'Não foi possível gravar a rejeição no banco de dados.'
      });
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
    }
  };

  // Direct Delete
  const handleDirectDelete = async (report: FieldProductionReport) => {
    if (!onDeleteReport) return;
    const confirmMsg = report.status === 'approved'
      ? 'Atenção: Este registro está APROVADO. Deseja realmente excluí-lo? A quantidade produzida será deduzida dos totais do serviço no banco de dados.'
      : 'Deseja realmente excluir este registro de campo do banco de dados?';

    if (!window.confirm(confirmMsg)) return;

    setIsProcessing(true);
    setProcessingMessage('Excluindo registro permanentemente do banco de dados...');
    try {
      await onDeleteReport(report.id);
      setFeedbackModal({
        isOpen: true,
        type: 'success',
        title: 'Registro Excluído do Banco de Dados!',
        message: 'O registro de campo foi excluído permanentemente e a alteração foi confirmada no banco de dados.'
      });
    } catch (err: any) {
      setFeedbackModal({
        isOpen: true,
        type: 'error',
        title: 'Erro ao Excluir',
        message: err?.message || 'Falha ao remover o registro do banco de dados.'
      });
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
    }
  };

  // Format date display (YYYY-MM-DD -> DD/MM/YYYY)
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Format timestamp (ISO -> DD/MM/YYYY HH:mm)
  const formatDateTime = (isoStr?: string) => {
    if (!isoStr) return 'Offline / Aguardando';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER PRINCIPAL CAMPO */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 rounded-3xl border border-blue-900/50 shadow-2xl text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-blue-600/30 border border-blue-500/40 text-blue-400 shadow-lg">
            <Smartphone className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight text-white">Gestão de Produção de Campo (PWA)</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider">
                Sincronização
              </span>
            </div>
            <p className="text-xs text-blue-200/80 mt-1 font-medium">
              Aprovação e validação das produções informadas no Synera Mobile. Somente após aprovação os quantitativos são consolidados no banco de dados.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto">
          <div className="bg-slate-900/80 border border-slate-700/80 px-4 py-2.5 rounded-2xl text-right">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">Obra Ativa</span>
            <span className="text-xs font-black text-emerald-400 truncate max-w-[180px] block">
              {contract.workName || contract.name || 'Contrato Ativo'}
            </span>
          </div>
        </div>
      </div>

      {/* CARDS DE ESTATÍSTICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          onClick={() => setFilterStatus('all')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            filterStatus === 'all' ? 'bg-blue-50 border-blue-300 shadow-md ring-2 ring-blue-500/20' : 'bg-white border-gray-100 hover:border-gray-200'
          }`}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">Total de Solicitados</span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-gray-900">{stats.total}</p>
          <p className="text-[11px] text-gray-400 mt-1 font-medium">Apontamentos recebidos do celular</p>
        </div>

        <div 
          onClick={() => setFilterStatus('pending')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            filterStatus === 'pending' ? 'bg-amber-50 border-amber-300 shadow-md ring-2 ring-amber-500/20' : 'bg-white border-gray-100 hover:border-gray-200'
          }`}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-extrabold text-amber-700 uppercase tracking-wider">Pendentes de Aprovação</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-900">{stats.pending}</p>
          <p className="text-[11px] text-amber-700/80 mt-1 font-bold">Requer análise da Sala Técnica</p>
        </div>

        <div 
          onClick={() => setFilterStatus('approved')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            filterStatus === 'approved' ? 'bg-emerald-50 border-emerald-300 shadow-md ring-2 ring-emerald-500/20' : 'bg-white border-gray-100 hover:border-gray-200'
          }`}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-extrabold text-emerald-700 uppercase tracking-wider">Aprovados & Gravados</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-900">{stats.approved}</p>
          <p className="text-[11px] text-emerald-700/80 mt-1 font-medium">Consolidados na planilha oficial</p>
        </div>

        <div 
          onClick={() => setFilterStatus('rejected')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            filterStatus === 'rejected' ? 'bg-rose-50 border-rose-300 shadow-md ring-2 ring-rose-500/20' : 'bg-white border-gray-100 hover:border-gray-200'
          }`}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-extrabold text-rose-700 uppercase tracking-wider">Rejeitados</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-900">{stats.rejected}</p>
          <p className="text-[11px] text-rose-700/80 mt-1 font-medium">Não incorporados ao banco</p>
        </div>
      </div>

      {/* BARRA DE FILTROS E PESQUISA */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
              filterStatus === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Todos ({stats.total})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
              filterStatus === 'pending' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-500 hover:text-amber-600'
            }`}
          >
            Pendentes ({stats.pending})
          </button>
          <button
            onClick={() => setFilterStatus('approved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
              filterStatus === 'approved' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-500 hover:text-emerald-600'
            }`}
          >
            Aprovados ({stats.approved})
          </button>
          <button
            onClick={() => setFilterStatus('rejected')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
              filterStatus === 'rejected' ? 'bg-rose-600 text-white shadow-sm' : 'text-gray-500 hover:text-rose-600'
            }`}
          >
            Rejeitados ({stats.rejected})
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input 
            type="text"
            placeholder="Buscar por serviço, apontador ou trecho..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-gray-50 border-gray-200 text-xs font-semibold focus:bg-white"
          />
        </div>
      </div>

      {/* TABELA DE REGISTROS DE CAMPO */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 uppercase font-extrabold tracking-wider text-[10px]">
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Data Produção</th>
                <th className="p-3.5">Data Sincronização</th>
                <th className="p-3.5">Serviço de Obra</th>
                <th className="p-3.5 text-right">Qtd. Informada</th>
                <th className="p-3.5">Trecho / Estaca</th>
                <th className="p-3.5">Apontador</th>
                <th className="p-3.5 text-center">Foto</th>
                <th className="p-3.5">Observações</th>
                <th className="p-3.5 text-center">Ações (Sala Técnica)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-gray-400">
                    <Smartphone className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="font-bold text-sm">Nenhum registro de campo encontrado.</p>
                    <p className="text-xs text-gray-400">Altere os filtros de pesquisa ou aguarde novas sincronicidades do Synera Mobile.</p>
                  </td>
                </tr>
              ) : (
                filteredReports.map((report, idx) => (
                  <tr key={`${report.id}-${idx}`} className="hover:bg-gray-50/80 transition-colors">
                    
                    {/* Status Badge */}
                    <td className="p-3.5">
                      {isPendingReport(report.status) && (
                        <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase flex items-center gap-1 w-fit">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Pendente
                        </span>
                      )}
                      {report.status === 'approved' && (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Aprovado
                        </span>
                      )}
                      {report.status === 'rejected' && (
                        <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black uppercase flex items-center gap-1 w-fit">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          Rejeitado
                        </span>
                      )}
                    </td>

                    {/* Data Produção Informada */}
                    <td className="p-3.5 font-bold text-gray-900 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        <span>{formatDate(report.productionDate)}</span>
                      </div>
                    </td>

                    {/* Data Sincronização */}
                    <td className="p-3.5 text-gray-500 whitespace-nowrap text-[11px]">
                      <div className="flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 text-gray-400" />
                        <span>{formatDateTime(report.syncedAt || (report.synced ? (report.createdAt || report.timestamp) : undefined))}</span>
                      </div>
                    </td>

                    {/* Serviço de Obra */}
                    <td className="p-3.5 max-w-xs">
                      <p className="font-extrabold text-gray-900 line-clamp-1">{report.serviceName}</p>
                      <span className="text-[10px] text-gray-400 font-mono">Unidade: {report.unit || 'un'}</span>
                    </td>

                    {/* Quantidade Realizada */}
                    <td className="p-3.5 text-right font-black text-sm text-blue-900 whitespace-nowrap">
                      {(report.qty || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} {report.unit}
                    </td>

                    {/* Trecho / Estaca */}
                    <td className="p-3.5 whitespace-nowrap">
                      {report.trecho ? (
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-bold text-[11px] border border-gray-200">
                          {report.trecho}
                        </span>
                      ) : (
                        <span className="text-gray-400 font-normal">-</span>
                      )}
                    </td>

                    {/* Apontador */}
                    <td className="p-3.5 font-semibold text-gray-800 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <HardHat className="w-3.5 h-3.5 text-amber-500" />
                        <span>{report.reportedBy}</span>
                      </div>
                    </td>

                    {/* Foto Evidência */}
                    <td className="p-3.5 text-center">
                      {(report.photo || report.photoUrl) ? (
                        <button
                          onClick={() => setViewingPhotoUrl(report.photo || report.photoUrl || null)}
                          className="px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold text-[10px] flex items-center gap-1 mx-auto border border-blue-200"
                        >
                          <Camera className="w-3 h-3" /> Foto
                        </button>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>

                    {/* Observações */}
                    <td className="p-3.5 max-w-xs text-gray-600 text-[11px] line-clamp-2">
                      {report.notes || '-'}
                    </td>

                    {/* Ações da Sala Técnica */}
                    <td className="p-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        
                        {/* Botão EDITAR (Disponível sempre antes ou depois de aprovar) */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEdit(report)}
                          className="h-8 px-2 text-xs font-bold text-gray-700 border-gray-200 hover:bg-gray-100 rounded-lg gap-1"
                          title="Editar informações do registro"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                          <span className="hidden sm:inline">Editar</span>
                        </Button>

                        {/* Botões APROVAR / REJEITAR para itens pendentes */}
                        {isPendingReport(report.status) && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleDirectApprove(report.id)}
                              className="h-8 px-2.5 text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg gap-1 shadow-sm"
                              title="Aprovar e Gravar no Banco de Dados"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Aprovar</span>
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setRejectingReport(report)}
                              className="h-8 px-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg"
                              title="Rejeitar solicitação"
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}

                        {/* Se já aprovado */}
                        {report.status === 'approved' && (
                          <span className="text-[10px] text-emerald-600 font-bold px-2 py-1 bg-emerald-50 rounded-md">
                            Gravado no Banco
                          </span>
                        )}

                        {/* Se rejeitado */}
                        {report.status === 'rejected' && (
                          <span className="text-[10px] text-rose-600 font-bold px-2 py-1 bg-rose-50 rounded-md">
                            Rejeitado
                          </span>
                        )}

                        {/* Botão EXCLUIR (Permite excluir qualquer registro, inclusive aprovados) */}
                        {onDeleteReport && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDirectDelete(report)}
                            className="h-8 px-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg gap-1"
                            title="Excluir registro do banco de dados"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span className="hidden sm:inline">Excluir</span>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* MODAL DE EDIÇÃO DE REGISTRO PELA SALA TÉCNICA */}
      {/* ---------------------------------------------------- */}
      <AnimatePresence>
        {editingReport && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-gray-100 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base font-black text-gray-900">Editar Apontamento de Campo</h3>
                </div>
                <button onClick={() => setEditingReport(null)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-bold text-gray-700">Serviço de Obra *</Label>
                  <select 
                    value={editServiceId} 
                    onChange={e => setEditServiceId(e.target.value)}
                    className="w-full h-11 rounded-2xl bg-gray-50 border border-gray-200 text-xs font-extrabold text-gray-900 p-2.5 mt-1 focus:bg-white focus:outline-none focus:border-blue-500"
                  >
                    {services.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.code ? `[${s.code}] ` : ''}{s.name} ({s.unit || 'un'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-bold text-gray-700">Quantidade Realizada *</Label>
                    <Input 
                      type="number" 
                      step="0.01"
                      value={editQty}
                      onChange={e => setEditQty(e.target.value)}
                      className="h-11 rounded-2xl bg-gray-50 border-gray-200 font-black text-sm text-blue-900 mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-gray-700">Data da Produção Informada *</Label>
                    <Input 
                      type="date"
                      value={editDate}
                      onChange={e => setEditDate(e.target.value)}
                      className="h-11 rounded-2xl bg-gray-50 border-gray-200 font-bold text-xs text-gray-900 mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-bold text-gray-700">Estaca / Trecho / Local de Aplicação</Label>
                  <Input 
                    value={editTrecho}
                    onChange={e => setEditTrecho(e.target.value)}
                    className="h-11 rounded-2xl bg-gray-50 border-gray-200 font-medium text-xs text-gray-900 mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-gray-700">Observações de Campo</Label>
                  <textarea 
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    rows={3}
                    className="w-full rounded-2xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-900 p-3 mt-1 focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <Button variant="ghost" onClick={() => setEditingReport(null)} className="h-10 px-4 text-xs font-bold">
                  Cancelar
                </Button>
                <Button variant="outline" onClick={handleSaveEdit} className="h-10 px-4 border-blue-200 text-blue-700 hover:bg-blue-50 font-extrabold text-xs rounded-xl shadow-sm">
                  Salvar
                </Button>
                <Button onClick={handleSaveAndApprove} className="h-10 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  <span>Aprovar e Gravar</span>
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------------------------------------------------- */}
      {/* MODAL DE REJEIÇÃO */}
      {/* ---------------------------------------------------- */}
      <AnimatePresence>
        {rejectingReport && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-gray-200 space-y-6 my-auto"
            >
              <div className="flex items-center gap-3 text-rose-600 pb-3 border-b border-rose-100">
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 shrink-0">
                  <AlertCircle className="w-7 h-7 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">Rejeitar Apontamento de Campo</h3>
                  <p className="text-xs text-gray-500 font-medium">O motivo informado será retornado diretamente ao apontador no Synera Mobile</p>
                </div>
              </div>

              <div className="bg-rose-50/60 p-4 rounded-2xl border border-rose-100 space-y-2">
                <p className="text-xs text-rose-900 font-bold uppercase tracking-wide">Resumo do Registro Selecionado:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-800">
                  <div><strong>Serviço:</strong> {rejectingReport.serviceName || 'N/A'}</div>
                  <div><strong>Quantidade:</strong> <span className="font-extrabold text-rose-700">{rejectingReport.qty} {rejectingReport.unit}</span></div>
                  <div><strong>Data Produção:</strong> {formatDate(rejectingReport.productionDate || '')}</div>
                  <div><strong>Apontador:</strong> {rejectingReport.reportedBy || rejectingReport.createdByName || 'N/A'}</div>
                  {rejectingReport.trecho && <div className="sm:col-span-2"><strong>Trecho/Estaca:</strong> {rejectingReport.trecho}</div>}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black text-gray-800 uppercase tracking-wider block">
                  Motivo da Rejeição * (Detalhe para o Apontador)
                </Label>
                <textarea 
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Descreva detalhadamente o motivo da não aprovação deste lançamento de campo..."
                  rows={4}
                  className="w-full rounded-2xl bg-gray-50 border border-gray-300 text-sm font-medium text-gray-900 p-4 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all outline-none"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <Button 
                  variant="ghost" 
                  onClick={() => setRejectingReport(null)} 
                  className="w-full sm:w-auto h-11 px-6 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleConfirmReject} 
                  className="w-full sm:w-auto h-11 px-6 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-rose-600/20"
                >
                  Confirmar Rejeição do Registro
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------------------------------------------------- */}
      {/* MODAL DE VISUALIZAÇÃO DE FOTO */}
      {/* ---------------------------------------------------- */}
      <AnimatePresence>
        {viewingPhotoUrl && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setViewingPhotoUrl(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative bg-slate-900 p-2 rounded-3xl max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl border border-slate-700" onClick={e => e.stopPropagation()}>
              <button onClick={() => setViewingPhotoUrl(null)} className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-950/80 text-white hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
              <img src={viewingPhotoUrl} alt="Evidência de Campo" className="w-full h-auto max-h-[75vh] object-contain rounded-2xl" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------------------------------------------------- */}
      {/* MODAL DE FEEDBACK DE BANCO DE DADOS */}
      {/* ---------------------------------------------------- */}
      <AnimatePresence>
        {feedbackModal.isOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-100 text-center space-y-4"
            >
              <div 
                className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                style={{
                  backgroundColor: feedbackModal.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                  color: feedbackModal.type === 'success' ? '#059669' : '#DC2626'
                }}
              >
                {feedbackModal.type === 'success' ? (
                  <CheckCircle2 className="w-8 h-8" />
                ) : (
                  <AlertCircle className="w-8 h-8" />
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-black text-gray-900 tracking-tight">
                  {feedbackModal.title}
                </h3>
                <p className="text-xs text-gray-600 font-medium leading-relaxed">
                  {feedbackModal.message}
                </p>
              </div>

              <div className="pt-2">
                <Button
                  onClick={() => setFeedbackModal(prev => ({ ...prev, isOpen: false }))}
                  className={`w-full h-11 rounded-2xl font-black text-xs uppercase tracking-wider text-white shadow-md ${
                    feedbackModal.type === 'success'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                      : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                  }`}
                >
                  Entendido
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------------------------------------------------- */}
      {/* OVERLAY DE PROCESSAMENTO NO BANCO DE DADOS */}
      {/* ---------------------------------------------------- */}
      <AnimatePresence>
        {isProcessing && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-900 text-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-800 text-center space-y-4"
            >
              <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 animate-spin">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white">Processando no Banco de Dados</h4>
                <p className="text-xs text-slate-400 mt-1">{processingMessage || 'Gravando alterações...'}</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
