import React, { useState } from 'react';
import { UserProfile, TechnicalRating, Club, PlayerPosition } from '../types';
import { LANGUAGES, Language, PLAYER_POSITIONS } from '../constants';
import { Shield, Zap, Target, Save, Compass, ShieldCheck, CheckCircle2, Video, Sparkles, CreditCard } from 'lucide-react';
import { cn } from '../lib/utils';
import { ImageUploadPicker } from './ImageUploadPicker';

interface ProfileFormProps {
  user: UserProfile;
  lang: Language;
  clubs?: Club[];
  onSave: (ratings: UserProfile['ratings'], photoURL?: string, description?: string, clubName?: string, clubLogoURL?: string, position?: string) => void;
}

export function ProfileForm({ user, lang, clubs = [], onSave }: ProfileFormProps) {
  const t = LANGUAGES[lang];
  const [ratings, setRatings] = useState(user.ratings);
  const [photoURL, setPhotoURL] = useState(user.photoURL || '');
  const [description, setDescription] = useState(user.description || '');
  const [clubName, setClubName] = useState(user.clubName || '');
  const [clubLogoURL, setClubLogoURL] = useState(user.clubLogoURL || '');
  const [position, setPosition] = useState<string>(user.position || 'CM');

  const handleRatingChange = (field: keyof UserProfile['ratings'], value: TechnicalRating) => {
    setRatings(prev => ({ ...prev, [field]: value }));
  };

  const isAccountPaid = user.accountStatus === 'paid' || user.paidStatus === 'paid' || user.subscriptionStatus === 'active';

  return (
    <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-sm space-y-8">
      <div className="flex items-center space-x-4">
        <div className="relative">
          {photoURL ? (
            <img 
              src={photoURL} 
              alt={user.displayName} 
              className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-2xl">
              {user.displayName[0]}
            </div>
          )}
          {clubLogoURL && (
            <img 
              src={clubLogoURL} 
              alt="Club Logo" 
              className="w-8 h-8 rounded-full absolute -bottom-1 -right-1 border-2 border-white shadow-sm bg-white"
              referrerPolicy="no-referrer"
            />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-gray-900">{user.displayName}</h2>
            {isAccountPaid ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                {lang === 'pt' ? 'Conta Paga' : 'Paid Account'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                {lang === 'pt' ? 'Conta Grátis' : 'Free Account'}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">{user.email}</p>
          {clubName && <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mt-1">{clubName}</p>}
        </div>
      </div>

      {/* Account Status Card */}
      <div className={cn(
        "p-4 rounded-2xl border text-sm transition-all",
        isAccountPaid 
          ? "bg-gradient-to-r from-emerald-50 via-teal-50 to-green-50 border-emerald-200 text-emerald-950" 
          : "bg-gray-50 border-gray-200 text-gray-700"
      )}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 font-bold text-sm">
            {isAccountPaid ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>{lang === 'pt' ? 'Status da Conta: Ativo e Pago' : 'Account Status: Active & Paid'}</span>
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 text-gray-500" />
                <span>{lang === 'pt' ? 'Status da Conta: Padrão / Grátis' : 'Account Status: Free / Default'}</span>
              </>
            )}
          </div>
          {isAccountPaid && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-600 text-white">
              {lang === 'pt' ? 'Liberado' : 'Unlocked'}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-600 leading-relaxed mb-3">
          {isAccountPaid 
            ? (lang === 'pt' 
                ? 'Seu acesso está liberado para estatísticas completas da liga e transmissões ao vivo.'
                : 'Your access is fully unlocked for league statistics and live video streaming.')
            : (lang === 'pt'
                ? 'Ative sua mensalidade ou compre bilhetes de live para desbloquear transmissões e recursos da liga.'
                : 'Activate your monthly license or buy live tickets to unlock streaming and league features.')
          }
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold",
            user.subscriptionStatus === 'active' || user.accountStatus === 'paid'
              ? "bg-white text-emerald-700 shadow-xs border border-emerald-200"
              : "bg-white/80 text-gray-500 border border-gray-200"
          )}>
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              {lang === 'pt' ? 'Mensalidade da Liga: ' : 'Monthly Fee: '}
              <strong>{user.subscriptionStatus === 'active' ? (lang === 'pt' ? 'Ativa' : 'Active') : (lang === 'pt' ? 'Pendente' : 'Pending')}</strong>
            </span>
            {user.subscriptionExpiresAt && (
              <span className="text-[10px] text-gray-400 font-normal">
                ({new Date(user.subscriptionExpiresAt).toLocaleDateString('pt-MZ')})
              </span>
            )}
          </div>

          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold",
            user.hasLiveAccess || (user.purchasedLiveMatchIds && user.purchasedLiveMatchIds.length > 0)
              ? "bg-white text-emerald-700 shadow-xs border border-emerald-200"
              : "bg-white/80 text-gray-500 border border-gray-200"
          )}>
            <Video className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              {lang === 'pt' ? 'Live Stream: ' : 'Live Stream: '}
              <strong>
                {user.hasLiveAccess || (user.purchasedLiveMatchIds && user.purchasedLiveMatchIds.length > 0)
                  ? (lang === 'pt' ? 'Liberado' : 'Unlocked') 
                  : (lang === 'pt' ? 'Bloqueado' : 'Locked')}
              </strong>
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {/* Player Profile Photo Picker with Gallery Support */}
        <ImageUploadPicker
          label={lang === 'pt' ? 'Foto de Perfil do Jogador' : 'Player Profile Photo'}
          value={photoURL}
          onChange={setPhotoURL}
          shape="circle"
          placeholderLetter={user.displayName}
          lang={lang}
          helperText={lang === 'pt' ? 'Escolhe da galeria do telemóvel ou tira uma foto para o teu perfil' : 'Pick from device gallery or take a photo'}
        />

        {/* Club Affiliation & Club Logo */}
        <div className="space-y-4 pt-2 border-t border-gray-100">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">{t.club}</label>
            <input
              type="text"
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
              placeholder="Ex: Costa do Sol"
              className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            {clubs.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1.5 items-center">
                <span className="text-[10px] text-gray-400 font-semibold">{lang === 'pt' ? 'Clubes sugeridos:' : 'Suggested clubs:'}</span>
                {clubs.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setClubName(c.name);
                      if (c.logoURL) setClubLogoURL(c.logoURL);
                    }}
                    className={cn(
                      "text-[11px] font-bold px-2 py-0.5 rounded-lg border transition-colors cursor-pointer",
                      clubName === c.name 
                        ? "bg-emerald-600 text-white border-emerald-600" 
                        : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
                    )}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Club Logo Picker with Gallery Support */}
          <ImageUploadPicker
            label={lang === 'pt' ? 'Logótipo / Emblema do Clube' : 'Club Logo / Badge'}
            value={clubLogoURL}
            onChange={setClubLogoURL}
            shape="shield"
            placeholderLetter={clubName || 'C'}
            lang={lang}
            helperText={lang === 'pt' ? 'Carrega a imagem do emblema da tua equipa a partir da galeria' : 'Upload club emblem image from your device gallery'}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">{t.description}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="..."
            className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none min-h-[80px] resize-none"
          />
        </div>

        {/* Player Position in Profile */}
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase font-bold text-gray-400 tracking-widest flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-emerald-600" />
            {lang === 'pt' ? 'Posição Principal do Jogador' : 'Main Position'}
          </label>
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
          >
            {Object.values(PLAYER_POSITIONS).map(pos => (
              <option key={pos.code} value={pos.code}>
                [{pos.code}] {pos.namePt}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-6">
        <RatingSlider
          label={t.defense}
          icon={<Shield className="w-4 h-4 text-blue-500" />}
          value={ratings.defense}
          onChange={(v) => handleRatingChange('defense', v as TechnicalRating)}
        />
        <RatingSlider
          label={t.passing}
          icon={<Zap className="w-4 h-4 text-yellow-500" />}
          value={ratings.passing}
          onChange={(v) => handleRatingChange('passing', v as TechnicalRating)}
        />
        <RatingSlider
          label={t.finishing}
          icon={<Target className="w-4 h-4 text-red-500" />}
          value={ratings.finishing}
          onChange={(v) => handleRatingChange('finishing', v as TechnicalRating)}
        />
      </div>

      <button
        onClick={() => onSave(ratings, photoURL, description, clubName, clubLogoURL, position)}
        className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center shadow-lg shadow-emerald-600/20 cursor-pointer"
      >
        <Save className="w-5 h-5 mr-2" />
        {t.confirm}
      </button>
    </div>
  );
}

function RatingSlider({ label, icon, value, onChange }: { label: string, icon: React.ReactNode, value: number, onChange: (v: number) => void }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center text-sm font-bold text-gray-700">
          {icon}
          <span className="ml-2">{label}</span>
        </div>
        <span className="text-sm font-bold text-emerald-600">{value} / 5</span>
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((v) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={cn(
              "flex-1 py-2 rounded-lg text-sm font-bold transition-all",
              value === v
                ? "bg-emerald-600 text-white shadow-md"
                : "bg-gray-50 text-gray-400 hover:bg-gray-100"
            )}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}
