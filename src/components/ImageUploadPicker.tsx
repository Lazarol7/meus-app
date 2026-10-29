import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Upload, Link as LinkIcon, Trash2, Check, RefreshCw, AlertCircle, Shield, User, Sparkles, FolderOpen } from 'lucide-react';
import { compressImageFile, validateImageFile } from '../lib/imageUtils';
import { cn } from '../lib/utils';
import { Language } from '../constants';

export interface BadgePreset {
  label: string;
  svgDataUrl: string;
}

export const DEFAULT_SOCCER_BADGE_PRESETS: BadgePreset[] = [
  {
    label: 'Esmeralda FC',
    svgDataUrl: `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,5 90,20 90,65 50,95 10,65 10,20" fill="#059669"/><polygon points="50,12 82,24 82,60 50,85 18,60 18,24" fill="#047857"/><circle cx="50" cy="46" r="20" fill="#ffffff"/><polygon points="50,30 55,42 67,42 58,50 61,62 50,54 39,62 42,50 33,42 45,42" fill="#059669"/></svg>')}`,
  },
  {
    label: 'Estrela Vermelha',
    svgDataUrl: `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,5 90,20 90,65 50,95 10,65 10,20" fill="#dc2626"/><polygon points="50,12 82,24 82,60 50,85 18,60 18,24" fill="#18181b"/><circle cx="50" cy="46" r="20" fill="#dc2626"/><polygon points="50,30 55,42 67,42 58,50 61,62 50,54 39,62 42,50 33,42 45,42" fill="#ffffff"/></svg>')}`,
  },
  {
    label: 'Azul Real',
    svgDataUrl: `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,5 90,20 90,65 50,95 10,65 10,20" fill="#2563eb"/><polygon points="50,12 82,24 82,60 50,85 18,60 18,24" fill="#1d4ed8"/><circle cx="50" cy="46" r="20" fill="#ffffff"/><polygon points="50,30 55,42 67,42 58,50 61,62 50,54 39,62 42,50 33,42 45,42" fill="#2563eb"/></svg>')}`,
  },
  {
    label: 'Ouro e Preto',
    svgDataUrl: `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,5 90,20 90,65 50,95 10,65 10,20" fill="#d97706"/><polygon points="50,12 82,24 82,60 50,85 18,60 18,24" fill="#18181b"/><circle cx="50" cy="46" r="20" fill="#fbbf24"/><polygon points="50,30 55,42 67,42 58,50 61,62 50,54 39,62 42,50 33,42 45,42" fill="#18181b"/></svg>')}`,
  },
  {
    label: 'Águia Dourada',
    svgDataUrl: `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,5 90,20 90,65 50,95 10,65 10,20" fill="#b45309"/><polygon points="50,12 82,24 82,60 50,85 18,60 18,24" fill="#fef08a"/><circle cx="50" cy="46" r="22" fill="#b45309"/><circle cx="50" cy="46" r="16" fill="#fef08a"/><path d="M40,55 Q50,35 60,55 Q50,50 40,55" fill="#b45309"/></svg>')}`,
  },
  {
    label: 'Leões do Bairro',
    svgDataUrl: `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,5 90,20 90,65 50,95 10,65 10,20" fill="#047857"/><polygon points="50,12 82,24 82,60 50,85 18,60 18,24" fill="#fbbf24"/><circle cx="50" cy="46" r="20" fill="#047857"/><polygon points="50,32 54,42 65,42 56,49 59,60 50,53 41,60 44,49 35,42 46,42" fill="#fbbf24"/></svg>')}`,
  },
  {
    label: 'Pantera Negra',
    svgDataUrl: `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,5 90,20 90,65 50,95 10,65 10,20" fill="#09090b"/><polygon points="50,12 82,24 82,60 50,85 18,60 18,24" fill="#27272a"/><circle cx="50" cy="46" r="20" fill="#ffffff"/><circle cx="50" cy="46" r="14" fill="#09090b"/><polygon points="50,36 53,44 61,44 55,49 57,57 50,52 43,57 45,49 39,44 47,44" fill="#fbbf24"/></svg>')}`,
  },
  {
    label: 'Céu & Branco',
    svgDataUrl: `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,5 90,20 90,65 50,95 10,65 10,20" fill="#0284c7"/><polygon points="50,12 82,24 82,60 50,85 18,60 18,24" fill="#ffffff"/><circle cx="50" cy="46" r="20" fill="#0284c7"/><polygon points="50,30 55,42 67,42 58,50 61,62 50,54 39,62 42,50 33,42 45,42" fill="#ffffff"/></svg>')}`,
  },
];

interface ImageUploadPickerProps {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  shape?: 'circle' | 'square' | 'shield';
  placeholderLetter?: string;
  helperText?: string;
  lang?: Language;
  allowUrlInput?: boolean;
  badgePresets?: BadgePreset[];
}

export function ImageUploadPicker({
  label,
  value,
  onChange,
  shape = 'circle',
  placeholderLetter = '?',
  helperText,
  lang = 'pt',
  allowUrlInput = true,
  badgePresets = DEFAULT_SOCCER_BADGE_PRESETS,
}: ImageUploadPickerProps) {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const [isCompressing, setIsCompressing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showUrlField, setShowUrlField] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [urlInput, setUrlInput] = useState(value && !value.startsWith('data:') ? value : '');
  const [isDragging, setIsDragging] = useState(false);

  const isPortuguese = lang === 'pt';

  const handleTriggerGallery = () => {
    setErrorMsg(null);
    galleryInputRef.current?.click();
  };

  const handleTriggerCamera = () => {
    setErrorMsg(null);
    cameraInputRef.current?.click();
  };

  const processFile = async (file: File) => {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setErrorMsg(validation.error || (isPortuguese ? 'Ficheiro de imagem inválido' : 'Invalid image file'));
      return;
    }

    try {
      setIsCompressing(true);
      setErrorMsg(null);
      // Compress to max 512x512 with 0.84 quality: ~25-45KB base64 JPEG
      const compressedDataUrl = await compressImageFile(file, {
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.84,
      });

      onChange(compressedDataUrl);
    } catch (err: any) {
      console.error('Error compressing image:', err);
      setErrorMsg(isPortuguese ? 'Erro ao processar imagem. Tente outra foto.' : 'Error processing photo. Try another image.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    await processFile(file);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setUrlInput('');
    setErrorMsg(null);
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      setShowUrlField(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Label and optional URL toggle */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          <span>{label}</span>
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowPresets(!showPresets)}
            className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
          >
            <Sparkles size={12} />
            <span>{showPresets ? (isPortuguese ? 'Fechar Emblemas' : 'Close Badges') : (isPortuguese ? 'Emblemas Prontos' : 'Preset Badges')}</span>
          </button>
          {allowUrlInput && (
            <button
              type="button"
              onClick={() => setShowUrlField(!showUrlField)}
              className="text-[11px] font-medium text-gray-500 hover:text-gray-800 flex items-center gap-1 cursor-pointer"
            >
              <LinkIcon size={12} />
              <span>{showUrlField ? (isPortuguese ? 'Ocultar Link' : 'Hide') : 'Link URL'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Upload / Preview Container */}
      <div 
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl border transition-all",
          isDragging 
            ? "border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/30" 
            : value
            ? "bg-emerald-50/30 border-emerald-200"
            : "bg-gray-50/80 border-gray-200 hover:border-gray-300"
        )}
      >
        {/* Hidden native file input for Gallery (NO capture attribute for direct gallery access) */}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Hidden native file input for Mobile Camera */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Visual Preview Box */}
        <div className="relative group shrink-0">
          <div
            onClick={handleTriggerGallery}
            className={cn(
              "w-24 h-24 overflow-hidden flex items-center justify-center cursor-pointer transition-all border-2 shadow-sm bg-white relative",
              shape === 'circle' && "rounded-full",
              shape === 'square' && "rounded-2xl",
              shape === 'shield' && "rounded-2xl border-emerald-500/40",
              value ? "border-emerald-500" : "border-dashed border-gray-300 hover:border-emerald-500"
            )}
            title={isPortuguese ? 'Clique para trocar imagem' : 'Click to change image'}
          >
            {value ? (
              <img
                src={value}
                alt="Símbolo"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-gray-400 p-2 text-center">
                {shape === 'shield' ? (
                  <Shield className="w-9 h-9 text-emerald-500/60" />
                ) : placeholderLetter && placeholderLetter !== '?' ? (
                  <span className="text-3xl font-black text-emerald-600 uppercase">
                    {placeholderLetter[0]}
                  </span>
                ) : (
                  <User className="w-9 h-9 text-gray-300" />
                )}
                <span className="text-[9px] font-bold text-gray-400 mt-1 uppercase">
                  {isPortuguese ? 'Sem Símbolo' : 'No Logo'}
                </span>
              </div>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white text-[10px] font-bold">
              <Camera size={20} />
              <span>{isPortuguese ? 'Trocar' : 'Change'}</span>
            </div>

            {/* Compressing indicator */}
            {isCompressing && (
              <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center">
                <RefreshCw size={24} className="text-emerald-600 animate-spin" />
                <span className="text-[10px] font-bold text-emerald-700 mt-1">A carregar...</span>
              </div>
            )}
          </div>

          {/* Badge indicating success when set */}
          {value && (
            <div className="absolute -top-1.5 -right-1.5 bg-emerald-600 text-white rounded-full p-1.5 shadow-md border-2 border-white">
              <Check size={12} strokeWidth={3} />
            </div>
          )}
        </div>

        {/* Action Buttons & Prompt */}
        <div className="flex-1 text-center sm:text-left space-y-2.5 w-full">
          <div>
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <span className="font-extrabold text-sm text-gray-900">
                {value 
                  ? (isPortuguese ? '✓ Símbolo Carregado' : '✓ Crest Uploaded') 
                  : (isPortuguese ? 'Adicionar Símbolo do Clube' : 'Add Club Crest')}
              </span>
              {value && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  Pronto
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {helperText || (isPortuguese 
                ? 'Escolhe qualquer imagem do teu telemóvel/computador ou tira foto do escudo da equipa.' 
                : 'Pick any image from your gallery or take a picture of the badge.')}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            {/* Gallery Upload (Primary) */}
            <button
              type="button"
              disabled={isCompressing}
              onClick={handleTriggerGallery}
              className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
            >
              <FolderOpen size={15} />
              <span>
                {value 
                  ? (isPortuguese ? 'Trocar da Galeria' : 'Change from Gallery') 
                  : (isPortuguese ? '📁 Escolher da Galeria' : '📁 Pick from Gallery')}
              </span>
            </button>

            {/* Mobile Camera Button */}
            <button
              type="button"
              disabled={isCompressing}
              onClick={handleTriggerCamera}
              className="bg-gray-900 hover:bg-black active:scale-95 disabled:opacity-50 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Camera size={14} />
              <span>{isPortuguese ? 'Tirar Foto' : 'Camera'}</span>
            </button>

            {/* Remove Button */}
            {value && (
              <button
                type="button"
                onClick={handleRemove}
                className="bg-white hover:bg-red-50 text-gray-600 hover:text-red-600 border border-gray-200 px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                title={isPortuguese ? 'Remover símbolo' : 'Remove badge'}
              >
                <Trash2 size={13} />
                <span>{isPortuguese ? 'Remover' : 'Remove'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Preset Badges for Club Logos */}
      {(showPresets || (!value && badgePresets && badgePresets.length > 0)) && (
        <div className="p-3.5 bg-gray-50/90 rounded-2xl border border-gray-200 space-y-2 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-600 flex items-center gap-1">
              <Sparkles size={11} className="text-amber-500" />
              {isPortuguese ? 'Emblemas Oficiais Prontos para Uso (1 Clique):' : 'Ready Club Crests (1-Click):'}
            </span>
            <span className="text-[10px] text-gray-400">
              {isPortuguese ? 'Ou usa uma foto tua acima' : 'Or upload custom image'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {badgePresets.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onChange(preset.svgDataUrl);
                  setShowPresets(false);
                }}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-xl text-left border transition-all cursor-pointer",
                  value === preset.svgDataUrl 
                    ? "bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500 shadow-xs" 
                    : "bg-white border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/30"
                )}
              >
                <img src={preset.svgDataUrl} alt={preset.label} className="w-7 h-7 rounded-lg object-contain shrink-0" />
                <span className="text-xs font-bold text-gray-800 truncate">{preset.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Collapsible URL input */}
      {showUrlField && (
        <div className="flex gap-2 pt-1 animate-fade-in">
          <div className="relative flex-1">
            <LinkIcon className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            <input
              type="url"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              placeholder="https://exemplo.com/emblema.png"
              className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleUrlSubmit}
            className="bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-black transition-colors cursor-pointer"
          >
            {isPortuguese ? 'Inserir' : 'Apply'}
          </button>
        </div>
      )}

      {/* Error alert */}
      {errorMsg && (
        <div className="flex items-center gap-1.5 p-2 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-bold animate-fade-in">
          <AlertCircle size={15} className="shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
