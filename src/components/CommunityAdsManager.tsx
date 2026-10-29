import React, { useState } from 'react';
import { CommunityAd, UserProfile } from '../types';
import { Language } from '../constants';
import { 
  Megaphone, Plus, Phone, MessageCircle, ExternalLink, 
  Trash2, Edit3, CheckCircle2, Store, Tag, Sparkles, X, Save, AlertCircle
} from 'lucide-react';
import { ImageUploadPicker } from './ImageUploadPicker';
import { cn } from '../lib/utils';

interface CommunityAdsManagerProps {
  ads: CommunityAd[];
  currentUser: UserProfile | null;
  lang?: Language;
  onSaveAd: (adData: Omit<CommunityAd, 'id' | 'createdAt'>) => Promise<void> | void;
  onDeleteAd: (adId: string) => Promise<void> | void;
  onTrackAdClick?: (adId: string) => void;
  onRequestLogin?: () => void;
}

const AD_CATEGORIES = [
  'Restaurante / Bar',
  'Barbearia & Salão',
  'Oficina / Auto',
  'Loja & Vestuário',
  'Bebidas & Mercearia',
  'Desporto & Ginásio',
  'Serviços & Outros',
];

const PRESET_AD_IMAGES = [
  {
    name: 'Restaurante / Comida',
    url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Barbearia / Estilo',
    url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Oficina / Carros',
    url: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Bebidas & Convívio',
    url: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Desporto & Chuteiras',
    url: 'https://images.unsplash.com/photo-1511886929837-354d827aae26?auto=format&fit=crop&w=800&q=80',
  },
];

export function CommunityAdsManager({
  ads,
  currentUser,
  lang = 'pt',
  onSaveAd,
  onDeleteAd,
  onTrackAdClick,
  onRequestLogin,
}: CommunityAdsManagerProps) {
  const isAdmin = currentUser?.role === 'admin' || 
    currentUser?.email === 'lazaroatalia80@gmail.com' || 
    currentUser?.email === 'lazaratala80@gmail.com';

  const canPostAd = isAdmin || 
    (currentUser?.subscriptionStatus === 'active' && (currentUser?.subscriptionExpiresAt || 0) > Date.now()) ||
    currentUser?.canPostContent === true ||
    currentUser?.canPostNews === true;

  const [isCreating, setIsCreating] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Form states
  const [businessName, setBusinessName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(AD_CATEGORIES[0]);
  const [imageURL, setImageURL] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setBusinessName('');
    setTitle('');
    setDescription('');
    setCategory(AD_CATEGORIES[0]);
    setImageURL('');
    setPhone('');
    setWhatsapp('');
    setLocation('');
    setIsCreating(false);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !title.trim()) return;

    setIsSubmitting(true);
    try {
      await onSaveAd({
        businessName: businessName.trim(),
        title: title.trim(),
        description: description.trim(),
        category,
        imageURL: imageURL.trim() || PRESET_AD_IMAGES[0].url,
        phone: phone.trim() || undefined,
        whatsapp: whatsapp.trim() || undefined,
        location: location.trim() || undefined,
        active: true,
        createdBy: currentUser.uid,
        views: 0,
        clicks: 0,
      });
      resetForm();
    } catch (err) {
      console.error('Error saving ad:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAds = ads.filter(ad => {
    if (selectedCategory === 'all') return true;
    return ad.category === selectedCategory;
  });

  return (
    <div className="bg-white rounded-3xl p-5 md:p-6 border border-black/5 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Megaphone size={18} />
            </span>
            <h3 className="font-extrabold text-gray-900 text-lg">
              {lang === 'pt' ? 'Anúncios e Negócios Locais' : 'Community & Business Ads'}
            </h3>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {lang === 'pt'
              ? 'Divulgação de negócios, patrocinadores, barbearias, oficinas e restaurantes do bairro'
              : 'Sponsors and local business promotions'}
          </p>
        </div>

        {/* Add Ad Button (Admin, Paid Subscribers, or Authorized Users) */}
        {!isCreating && (
          <button
            type="button"
            onClick={() => {
              if (!currentUser || currentUser.uid === 'visitor') {
                if (onRequestLogin) onRequestLogin();
                return;
              }
              if (!canPostAd) {
                setPermissionError(
                  'Apenas o Administrador Master, utilizadores com mensalidade activa (600 MT) ou pessoas autorizadas pelo administrador podem publicar anúncios e notícias no Be-Lwezer.'
                );
                return;
              }
              setPermissionError(null);
              setIsCreating(true);
            }}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Plus size={15} />
            <span>{lang === 'pt' ? 'Publicar Anúncio' : 'Create Ad'}</span>
          </button>
        )}
      </div>

      {permissionError && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-700 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-600 shrink-0" />
            <span>{permissionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setPermissionError(null)}
            className="text-amber-800 hover:text-amber-950 font-bold p-1 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Creation Form */}
      {isCreating && (
        <form onSubmit={handleCreateSubmit} className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-sm text-gray-900 flex items-center gap-1.5">
              <Store size={16} className="text-emerald-600" />
              <span>{lang === 'pt' ? 'Criar Novo Anúncio de Negócio' : 'Create Business Ad'}</span>
            </h4>
            <button
              type="button"
              onClick={resetForm}
              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                {lang === 'pt' ? 'Nome do Negócio / Empresa *' : 'Business Name *'}
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                placeholder={lang === 'pt' ? 'Ex: Barbearia do Bairro' : 'Ex: Neighborhood Barber'}
                className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                {lang === 'pt' ? 'Categoria do Negócio' : 'Category'}
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
              >
                {AD_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              {lang === 'pt' ? 'Título do Anúncio ou Promoção *' : 'Ad Headline *'}
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={lang === 'pt' ? 'Ex: Corte Especial nos dias de jogo com 20% de desconto!' : 'Ex: Match day special deal!'}
              className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              {lang === 'pt' ? 'Descrição / Serviços' : 'Description'}
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={lang === 'pt' ? 'Explica o que o teu negócio oferece e localização...' : 'Tell what you offer...'}
              className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                WhatsApp
              </label>
              <input
                type="text"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                placeholder="+258 84 000 0000"
                className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                {lang === 'pt' ? 'Telefone / Chamada' : 'Phone'}
              </label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+258 82 000 0000"
                className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                {lang === 'pt' ? 'Bairro / Local' : 'Location'}
              </label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Ex: Polana Caniço"
                className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* Image Picker / Presets */}
          <div className="space-y-2 pt-1 border-t border-gray-200">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
              {lang === 'pt' ? 'Foto / Imagem do Anúncio:' : 'Ad Banner Image:'}
            </span>
            <ImageUploadPicker
              label=""
              value={imageURL}
              onChange={setImageURL}
              shape="square"
              lang={lang}
              helperText={lang === 'pt' ? 'Escolhe da galeria ou clica num modelo abaixo' : 'Pick image or select preset'}
            />
            {/* Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {PRESET_AD_IMAGES.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setImageURL(preset.url)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 cursor-pointer"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save size={15} />
              <span>{isSubmitting ? (lang === 'pt' ? 'Guardando...' : 'Saving...') : (lang === 'pt' ? 'Guardar Anúncio' : 'Save Ad')}</span>
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-300 transition-colors cursor-pointer"
            >
              {lang === 'pt' ? 'Cancelar' : 'Cancel'}
            </button>
          </div>
        </form>
      )}

      {/* Category Filter Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors cursor-pointer",
            selectedCategory === 'all'
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          {lang === 'pt' ? 'Todos os Negócios' : 'All'}
        </button>
        {AD_CATEGORIES.map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors cursor-pointer",
              selectedCategory === cat
                ? "bg-emerald-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Ads Grid */}
      {filteredAds.length === 0 ? (
        <div className="p-8 bg-gray-50 rounded-2xl text-center border border-gray-100 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Megaphone size={24} />
          </div>
          <div>
            <h4 className="font-bold text-gray-800 text-sm">
              {lang === 'pt' ? 'Nenhum anúncio nesta categoria' : 'No ads yet'}
            </h4>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
              {lang === 'pt'
                ? 'Coloca anúncios do teu negócio, barbearia, restaurante ou oficina para os jogadores e adeptos verem!'
                : 'Promote your business or sponsor here for all players and fans to see!'}
            </p>
          </div>
          {!isCreating && (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              {lang === 'pt' ? '+ Criar Primeiro Anúncio' : '+ Create First Ad'}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAds.map(ad => {
            const canManage = isAdmin || ad.createdBy === currentUser.uid;

            return (
              <div
                key={ad.id}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Banner Image */}
                  {ad.imageURL && (
                    <div className="relative w-full h-36 bg-gray-100 overflow-hidden">
                      <img
                        src={ad.imageURL}
                        alt={ad.title}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-black/75 text-white backdrop-blur-xs">
                        {ad.category}
                      </span>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(lang === 'pt' ? 'Deseja excluir este anúncio?' : 'Delete this ad?')) {
                              onDeleteAd(ad.id);
                            }
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-600/90 text-white hover:bg-red-700 transition-colors cursor-pointer shadow-sm"
                          title="Excluir Anúncio"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Body Content */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-emerald-600 uppercase tracking-wider">
                        {ad.businessName}
                      </span>
                      {ad.location && (
                        <span className="text-[10px] text-gray-400">
                          📍 {ad.location}
                        </span>
                      )}
                    </div>

                    <h4 className="font-extrabold text-sm text-gray-900 leading-snug">
                      {ad.title}
                    </h4>

                    {ad.description && (
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {ad.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Contact CTAs (WhatsApp & Phone) */}
                <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {ad.whatsapp && (
                      <a
                        href={`https://wa.me/${ad.whatsapp.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => onTrackAdClick && onTrackAdClick(ad.id)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 transition-colors shadow-2xs"
                      >
                        <MessageCircle size={13} />
                        <span>WhatsApp</span>
                      </a>
                    )}

                    {ad.phone && (
                      <a
                        href={`tel:${ad.phone}`}
                        onClick={() => onTrackAdClick && onTrackAdClick(ad.id)}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 transition-colors shadow-2xs"
                      >
                        <Phone size={13} />
                        <span>{lang === 'pt' ? 'Ligar' : 'Call'}</span>
                      </a>
                    )}
                  </div>

                  <span className="text-[10px] text-gray-400 font-mono">
                    Parceiro do Bairro
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
