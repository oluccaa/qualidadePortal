import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../context/authContext.tsx';
import { qualityService } from '../../../../lib/services/index.ts';
import { supabase } from '../../../../lib/supabaseClient.ts';
import { ClientOrganization, FileNode, QualityStatus, UserRole, normalizeRole } from '../../../../types/index.ts';

export const useQualityPortfolio = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientOrganization[]>([]);
  const [pendingFiles, setPendingFiles] = useState<FileNode[]>([]);
  const [rejectedFiles, setRejectedFiles] = useState<FileNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadQualityData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const role = normalizeRole(user.role);
      const isClient = role === UserRole.CLIENT;

      // 1. Busca Portfólio Global (Apenas para Staff)
      if (!isClient) {
        const portfolio = await qualityService.getManagedPortfolio(user.id);
        setClients(portfolio);
      }

      /**
       * 2. Query de Pendências Operacionais
       * Para ANALISTA: Pendências são arquivos em 'PENDING' (aguardando liberação passo 1).
       * Para CLIENTE: Pendências são arquivos em 'SENT' (aguardando conferência passos 2/3).
       */
      const targetStatus = isClient ? QualityStatus.SENT : QualityStatus.PENDING;

      let pendingQuery = supabase
        .from('files')
        .select('*, profiles:uploaded_by(full_name)')
        .eq('metadata->>status', targetStatus)
        .neq('type', 'FOLDER');

      if (isClient) {
        pendingQuery = pendingQuery.eq('owner_id', user.organizationId);
      }

      const { data: pending, error: pendingError } = await pendingQuery;
      if (pendingError) console.error("Erro ao buscar pendências:", pendingError);

      /**
       * 3. Query de Divergências (Alertas Vermelhos)
       * Arquivos que já foram interagidos mas resultaram em REJECTED ou precisam de substituição (TO_DELETE).
       */
      let rejectedQuery = supabase
        .from('files')
        .select('*')
        .or(`metadata->>status.eq.${QualityStatus.REJECTED},metadata->>status.eq.${QualityStatus.TO_DELETE}`)
        .neq('type', 'FOLDER');

      if (isClient) {
        rejectedQuery = rejectedQuery.eq('owner_id', user.organizationId);
      }

      const { data: rejected, error: rejectedError } = await rejectedQuery;
      if (rejectedError) console.error("Erro ao buscar arquivos rejeitados:", rejectedError);

      setPendingFiles(pending || []);
      setRejectedFiles(rejected || []);
    } catch (err) {
      console.error("Quality Context Sync Failure:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadQualityData();
  }, [loadQualityData]);

  return { clients, pendingFiles, rejectedFiles, isLoading, refresh: loadQualityData };
};