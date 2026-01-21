import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../context/authContext.tsx';
import { useToast } from '../../../../context/notificationContext.tsx';
import { FileNode, QualityStatus, FileType, SteelBatchMetadata } from '../../../../types/index.ts';
import { qualityService, fileService } from '../../../../lib/services/index.ts';
import { supabase } from '../../../../lib/supabaseClient.ts';

export const useFileInspection = () => {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [inspectorFile, setInspectorFile] = useState<any | null>(null);
  const [loadingFile, setLoadingFile] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mainPreviewUrl, setMainPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<FileNode | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!user || !fileId) return;
    setLoadingFile(true);
    try {
      // Query robusta utilizando o mapeamento explícito da coluna owner_id
      const { data, error } = await supabase
        .from('files')
        .select('*, organizations:owner_id(name)')
        .eq('id', fileId)
        .maybeSingle();
        
      if (error) {
          console.error("[Quality Sync Error] Database failure:", error);
          throw error;
      }

      if (!data) throw new Error("Ativo não localizado no Ledger.");

      // Fix: Aligned mapping with Domain FileNode for consistency across the application
      const file = {
        ...data,
        ownerId: data.owner_id,
        parentId: data.parent_id,
        versionNumber: data.version_number,
        type: data.type as FileType,
        updatedAt: data.updated_at,
        storagePath: data.storage_path,
        metadata: data.metadata 
      };

      setInspectorFile(file);

      // Sincroniza a URL do laudo original
      if (file.storagePath && file.storagePath !== 'system/folder') {
          try {
              const url = await fileService.getSignedUrl(file.storagePath);
              setMainPreviewUrl(url);
          } catch (urlErr) {
              console.warn("[Quality Sync] Could not sign asset URL:", urlErr);
          }
      }
      
    } catch (err: any) {
      console.error("[Quality Sync Critical] Redirecting due to:", err);
      showToast("Falha na sincronização técnica.", 'error');
      navigate(-1);
    } finally {
      setLoadingFile(false);
    }
  }, [fileId, user, navigate, showToast]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleInspectAction = async (updates: Partial<SteelBatchMetadata>) => {
    if (!inspectorFile || !user) return;
    setIsProcessing(true);
    
    try {
      await qualityService.submitVeredict(user, inspectorFile, updates);
      showToast(`Protocolo industrial atualizado.`, 'success');
      
      setInspectorFile(prev => prev ? ({ 
        ...prev, 
        metadata: { ...prev.metadata!, ...updates } 
      }) : null);
    } catch (err) {
      showToast("Falha ao gravar veredito no ledger.", 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Fix: Added handleReplacementUpload to handle document rectification flow when a file is rejected
  const handleReplacementUpload = useCallback(async (newFileBlob: File) => {
    if (!inspectorFile || !user || !inspectorFile.ownerId) return;
    
    setIsProcessing(true);
    try {
        const nextVersion = (inspectorFile.versionNumber || 1) + 1;
        const newFileName = `v${nextVersion}_${inspectorFile.name.replace(/^v\d+_/, '')}`;
        
        const uploaded = await fileService.uploadFile(user, {
            name: newFileName,
            fileBlob: newFileBlob,
            parentId: inspectorFile.parentId,
            type: FileType.PDF,
            size: `${(newFileBlob.size / 1024 / 1024).toFixed(2)} MB`,
            mimeType: 'application/pdf'
        }, inspectorFile.ownerId);

        await fileService.updateFileMetadata(inspectorFile.id, {
            replacementFileId: uploaded.id,
            status: QualityStatus.SENT
        });

        await fetchDetails();
        showToast(`Versão ${nextVersion} implementada com sucesso.`, "success");
    } catch (e: any) {
        showToast(`Falha no versionamento: ${e.message}`, "error");
    } finally {
        setIsProcessing(false);
    }
  }, [inspectorFile, user, fetchDetails, showToast]);

  const handleUploadEvidence = useCallback(async (file: File) => {
    if (!inspectorFile || !user) return;
    setIsProcessing(true);
    try {
        const { data: evidenceFolder, error: folderError } = await supabase.from('files').upsert({
            name: 'Fotos e Evidências',
            type: 'FOLDER',
            parent_id: inspectorFile.parentId,
            owner_id: inspectorFile.ownerId,
            storage_path: 'system/folder',
            metadata: { status: 'SENT', is_evidence_folder: true }
        }, { onConflict: 'name,parent_id' }).select().single();

        if (folderError) throw folderError;

        const sanitizedName = file.name
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, "_")
            .replace(/[^a-zA-Z0-9._-]/g, "")
            .toLowerCase();
            
        const filePath = `${inspectorFile.ownerId}/${evidenceFolder.id}/${Date.now()}-${sanitizedName}`;

        const { error: uploadError } = await supabase.storage.from('certificates').upload(filePath, file);
        if (uploadError) throw uploadError;

        await supabase.from('files').insert({
            name: file.name,
            type: 'IMAGE',
            parent_id: evidenceFolder.id,
            owner_id: inspectorFile.ownerId,
            storage_path: filePath,
            size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
            metadata: { status: 'SENT', source: 'INSPECTION_EVIDENCE' }
        });

        showToast("Evidência anexada com sucesso.", "success");
    } catch (err) {
        showToast("Erro ao anexar evidência.", "error");
    } finally {
        setIsProcessing(false);
    }
  }, [inspectorFile, user, showToast]);

  return {
    inspectorFile,
    loadingFile,
    isProcessing,
    mainPreviewUrl,
    handleInspectAction,
    handleUploadEvidence,
    handleReplacementUpload,
    previewFile,
    setPreviewFile,
    user,
    handleDownload: async (file: FileNode) => {
      try {
        const url = await fileService.getSignedUrl(file.storagePath);
        window.open(url, '_blank');
      } catch { showToast("Erro ao baixar PDF.", 'error'); }
    },
    handleBackToClientFiles: () => navigate(-1)
  };
};