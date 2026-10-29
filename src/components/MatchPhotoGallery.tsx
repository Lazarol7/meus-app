import React, { useState } from 'react';
import { MatchPhoto, UserProfile } from '../types';
import { Language } from '../constants';
import { 
  Camera, Plus, Image as ImageIcon, X, Trash2, Maximize2, 
  ChevronLeft, ChevronRight, Upload, Link as LinkIcon, Check, Sparkles, User
} from 'lucide-react';
import { cn } from '../lib/utils';
import stadiumBannerImg from '../assets/images/besoccer_stadium_banner_1792625912137.jpg';

interface MatchPhotoGalleryProps {
  matchId: string;
  photos: MatchPhoto[];
  currentUser: UserProfile;
  isOrganizer: boolean;
  lang: Language;
  onAddPhoto: (photo: Omit<MatchPhoto, 'id' | 'createdAt'>) => Promise<void> | void;
  onDeletePhoto?: (photoId: string) => Promise<void> | void;
}

// Preset match moments that players can choose for quick snapshots
const PRESET_SNAPSHOTS = [
  {
    title: 'Golaço da Partida',
    titleEn: 'Wonder Goal',
    url: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=800&q=80',
    caption: 'Golaço no ângulo aos 75 minutos!',
  },
  {
    title: 'Defesaça do Guarda-Redes',
    titleEn: 'Great Save',
    url: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=800&q=80',
    caption: 'Defesa milagrosa no último lance da partida!',
  },
  {
    title: 'Comemoração da Equipa',
    titleEn: 'Team Celebration',
    url: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=800&q=80',
    caption: 'Abraço e comemoração do golo da vitória!',
  },
  {
    title: 'Plantel Reunido',
    titleEn: 'Squad Lineup',
    url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80',
    caption: 'Foto oficial de todos os craques antes do apito inicial.',
  },
  {
    title: 'Ambiente do Bairro',
    titleEn: 'Field Atmosphere',
    url: stadiumBannerImg,
    caption: 'O relvado iluminado sob os holofotes na pelada nocturna.',
  },
];

export function MatchPhotoGallery({
  matchId,
  photos = [],
  currentUser,
  isOrganizer,
  lang,
  onAddPhoto,
  onDeletePhoto,
}: MatchPhotoGalleryProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Photo Form State
  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'presets'>('upload');
  const [imageUrl, setImageUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const resetForm = () => {
    setImageUrl('');
    setCaption('');
    setImagePreview(null);
    setIsAddModalOpen(false);
  };

  // Handle local file selection and convert to compressed base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      // Compress image via canvas to keep Firestore document size small and fast
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 900;
        const MAX_HEIGHT = 900;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        setImagePreview(dataUrl);
        setImageUrl(dataUrl);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  // Handle selecting a preset snapshot
  const handleSelectPreset = (preset: typeof PRESET_SNAPSHOTS[0]) => {
    setImageUrl(preset.url);
    setImagePreview(preset.url);
    if (!caption) {
      setCaption(preset.caption);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalUrl = imagePreview || imageUrl.trim();
    if (!finalUrl) return;

    setIsSubmitting(true);
    try {
      await onAddPhoto({
        matchId,
        url: finalUrl,
        caption: caption.trim() || undefined,
        uploadedBy: currentUser.uid,
        uploadedByName: currentUser.displayName,
        uploadedByPhoto: currentUser.photoURL,
      });
      resetForm();
    } catch (err) {
      console.error('Failed to add photo:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedPhotoIndex === null) return;
    setSelectedPhotoIndex((selectedPhotoIndex + 1) % photos.length);
  };

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedPhotoIndex === null) return;
    setSelectedPhotoIndex((selectedPhotoIndex - 1 + photos.length) % photos.length);
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
            <Camera size={20} />
          </div>
          <div>
            <h3 className="font-black text-gray-900 text-lg leading-tight">
              {lang === 'pt' ? 'Galeria & Snapshots do Jogo' : 'Match Photo Gallery'}
            </h3>
            <p className="text-xs text-gray-400">
              {photos.length === 0
                ? (lang === 'pt' ? 'Sem fotos partilhadas ainda' : 'No snapshots yet')
                : `${photos.length} ${photos.length === 1 ? (lang === 'pt' ? 'foto registada' : 'snapshot') : (lang === 'pt' ? 'fotos registadas' : 'snapshots')}`}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 bg-emerald-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-600/20 active:scale-95 cursor-pointer"
        >
          <Plus size={16} />
          <span>{lang === 'pt' ? 'Adicionar Foto' : 'Add Photo'}</span>
        </button>
      </div>

      {/* Photo Gallery Grid */}
      {photos.length === 0 ? (
        <div className="text-center py-8 bg-gray-50/80 rounded-2xl border border-dashed border-gray-200 p-6 space-y-3">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-gray-400 mx-auto shadow-xs">
            <ImageIcon size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-700">
              {lang === 'pt' ? 'Ainda não foram adicionadas fotos desta partida' : 'No photos shared from this match yet'}
            </p>
            <p className="text-[11px] text-gray-400 max-w-xs mx-auto mt-0.5">
              {lang === 'pt' 
                ? 'Tiraste uma foto no jogo? Adiciona os melhores momentos, comemorações e golos!' 
                : 'Took a picture during the game? Share the highlights and celebrations with everyone!'}
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 bg-white text-emerald-700 border border-emerald-200 px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-50 transition-colors shadow-2xs cursor-pointer"
          >
            <Camera size={14} />
            <span>{lang === 'pt' ? 'Partilhar Primeira Foto' : 'Share First Photo'}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo, index) => {
            const canDelete = photo.uploadedBy === currentUser.uid || isOrganizer || currentUser.role === 'admin';

            return (
              <div
                key={photo.id}
                onClick={() => setSelectedPhotoIndex(index)}
                className="group relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 border border-black/5 cursor-pointer shadow-xs hover:shadow-md transition-all"
              >
                <img
                  src={photo.url}
                  alt={photo.caption || 'Match photo'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                />

                {/* Dark gradient scrim */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                {/* Caption & Uploader overlay */}
                <div className="absolute bottom-2 left-2 right-2 text-white">
                  {photo.caption && (
                    <p className="text-xs font-bold leading-tight line-clamp-1 text-white drop-shadow-xs">
                      {photo.caption}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-[10px] text-white/80 mt-1">
                    <span className="truncate">{photo.uploadedByName.split(' ')[0]}</span>
                    <Maximize2 size={12} className="opacity-70 group-hover:opacity-100" />
                  </div>
                </div>

                {/* Delete button */}
                {canDelete && onDeletePhoto && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(lang === 'pt' ? 'Eliminar esta foto?' : 'Delete this photo?')) {
                        onDeletePhoto(photo.id);
                      }
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                    title={lang === 'pt' ? 'Eliminar Foto' : 'Delete Photo'}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          IMAGE SELECTION & UPLOAD MODAL
          ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Camera size={18} />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-base leading-tight">
                    {lang === 'pt' ? 'Adicionar Snapshot do Jogo' : 'Add Match Snapshot'}
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    {lang === 'pt' ? 'Escolhe ou carrega uma fotografia da partida' : 'Upload or pick a match photo'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={resetForm}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Selection UI Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={cn(
                  "py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                  activeTab === 'upload' ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-800"
                )}
              >
                <Upload size={14} />
                <span>{lang === 'pt' ? 'Dispositivo' : 'Upload'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('presets')}
                className={cn(
                  "py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                  activeTab === 'presets' ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-800"
                )}
              >
                <Sparkles size={14} />
                <span>{lang === 'pt' ? 'Momentos' : 'Presets'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('url')}
                className={cn(
                  "py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                  activeTab === 'url' ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-800"
                )}
              >
                <LinkIcon size={14} />
                <span>URL</span>
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* TAB 1: File Upload */}
              {activeTab === 'upload' && (
                <div className="space-y-3">
                  <label className="border-2 border-dashed border-gray-200 hover:border-emerald-500 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-gray-50 hover:bg-emerald-50/30">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <Upload size={22} />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-gray-800">
                        {lang === 'pt' ? 'Clica para escolher uma foto' : 'Click to select a photo'}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {lang === 'pt' ? 'PNG, JPG ou da câmara do telemóvel' : 'PNG, JPG from mobile camera or gallery'}
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {/* TAB 2: Presets Selection UI */}
              {activeTab === 'presets' && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                    {lang === 'pt' ? 'Escolhe um momento da pelada:' : 'Select a match moment:'}
                  </span>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                    {PRESET_SNAPSHOTS.map((preset, i) => (
                      <div
                        key={i}
                        onClick={() => handleSelectPreset(preset)}
                        className={cn(
                          "relative rounded-xl overflow-hidden border p-2 cursor-pointer transition-all flex flex-col items-start gap-1",
                          (imagePreview === preset.url || imageUrl === preset.url)
                            ? "border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        )}
                      >
                        <img 
                          src={preset.url} 
                          alt={preset.title} 
                          className="w-full h-16 object-cover rounded-lg"
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-xs font-bold text-gray-900 leading-tight">
                          {lang === 'pt' ? preset.title : preset.titleEn}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: Web URL */}
              {activeTab === 'url' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {lang === 'pt' ? 'Link da Imagem (URL)' : 'Image URL'}
                  </label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={e => {
                      setImageUrl(e.target.value);
                      setImagePreview(e.target.value);
                    }}
                    placeholder="https://..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}

              {/* Preview of chosen image */}
              {imagePreview && (
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2 left-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Check size={10} />
                    {lang === 'pt' ? 'Foto selecionada' : 'Image selected'}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setImageUrl('');
                    }}
                    className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-lg hover:bg-black/80"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Caption Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {lang === 'pt' ? 'Legenda do Snapshot' : 'Photo Caption'}
                </label>
                <input
                  type="text"
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  placeholder={lang === 'pt' ? 'Ex: Golaço aos 89 minutos do Armando!' : 'e.g. Great goal at 89th minute!'}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Uploader indicator */}
              <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl text-xs text-gray-500">
                <User size={14} className="text-emerald-600" />
                <span>
                  {lang === 'pt' ? 'A publicar como:' : 'Publishing as:'} <strong className="text-gray-900">{currentUser.displayName}</strong>
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-3 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  {lang === 'pt' ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={!imagePreview && !imageUrl.trim() || isSubmitting}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Camera size={15} />
                  <span>
                    {isSubmitting
                      ? (lang === 'pt' ? 'A guardar...' : 'Saving...')
                      : (lang === 'pt' ? 'Guardar Snapshot' : 'Save Snapshot')}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          FULLSCREEN LIGHTBOX MODAL
          ========================================================================= */}
      {selectedPhotoIndex !== null && photos[selectedPhotoIndex] && (
        <div 
          onClick={() => setSelectedPhotoIndex(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between p-4 md:p-6 animate-fade-in"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between text-white z-10">
            <span className="text-xs font-bold text-white/70">
              {selectedPhotoIndex + 1} / {photos.length}
            </span>

            <button
              onClick={() => setSelectedPhotoIndex(null)}
              className="p-2 text-white/80 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Image & Navigation */}
          <div className="relative flex-1 flex items-center justify-center p-2 max-h-[75vh]">
            {photos.length > 1 && (
              <button
                onClick={handlePrevPhoto}
                className="absolute left-2 md:left-4 p-3 bg-white/15 hover:bg-white/30 text-white rounded-full transition-colors cursor-pointer"
              >
                <ChevronLeft size={24} />
              </button>
            )}

            <img
              src={photos[selectedPhotoIndex].url}
              alt={photos[selectedPhotoIndex].caption || 'Match photo'}
              className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl"
              referrerPolicy="no-referrer"
            />

            {photos.length > 1 && (
              <button
                onClick={handleNextPhoto}
                className="absolute right-2 md:right-4 p-3 bg-white/15 hover:bg-white/30 text-white rounded-full transition-colors cursor-pointer"
              >
                <ChevronRight size={24} />
              </button>
            )}
          </div>

          {/* Bottom Info Bar */}
          <div className="text-center text-white space-y-1 max-w-xl mx-auto py-2">
            {photos[selectedPhotoIndex].caption && (
              <p className="text-sm md:text-base font-bold drop-shadow-sm">
                "{photos[selectedPhotoIndex].caption}"
              </p>
            )}
            <p className="text-xs text-white/60">
              {lang === 'pt' ? 'Foto por' : 'Photo by'} {photos[selectedPhotoIndex].uploadedByName} · {new Date(photos[selectedPhotoIndex].createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
