import React, { useState, useEffect } from 'react';
import { X, Upload, Check, ExternalLink, Sparkles, Palette, Loader2 } from 'lucide-react';
import { api } from '../../api/client';
import { toast } from 'sonner';
import type { WallpaperConfig, LayoutName } from './types';
import { BUNDLED_WALLPAPERS, CURATED_WALLPAPERS } from './constants';
export type { LayoutName };

interface WallpaperPickerProps {
  currentWallpaper: WallpaperConfig;
  currentLayout?: LayoutName;
  onSelectWallpaper: (config: WallpaperConfig) => void;
  onSelectLayout?: (layout: LayoutName) => void;
  onClose: () => void;
}

const UNSPLASH_CATEGORIES = ['nature', 'minimal', 'space', 'abstract', 'dark', 'city'] as const;

export const WallpaperPicker: React.FC<WallpaperPickerProps> = ({
  currentWallpaper,
  onSelectWallpaper,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'curated' | 'gradients' | 'unsplash' | 'upload'>('curated');
  const [unsplashCategory, setUnsplashCategory] = useState<string>('nature');
  const [photos, setPhotos] = useState<any[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [unsplashNotConfigured, setUnsplashNotConfigured] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (activeTab !== 'unsplash') return;

    let isMounted = true;
    setIsLoadingPhotos(true);
    setUnsplashNotConfigured(false);

    api.focusSessions
      .getWallpaper(unsplashCategory)
      .then((data: any) => {
        if (!isMounted) return;
        if (data?.error === 'UNSPLASH_NOT_CONFIGURED') {
          setUnsplashNotConfigured(true);
          setPhotos([]);
        } else if (data?.wallpapers) {
          setPhotos(data.wallpapers);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setUnsplashNotConfigured(true);
      })
      .finally(() => {
        if (isMounted) setIsLoadingPhotos(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeTab, unsplashCategory]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const res = await api.upload.file(file);
      if (res.url) {
        onSelectWallpaper({
          type: 'upload',
          value: res.url,
          thumb: res.url,
          credit: file.name,
        });
        toast.success('Custom wallpaper applied!');
      }
    } catch (err: any) {
      toast.error('Failed to upload image: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-neutral-900/90 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-white">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-teal-400" />
            <h2 className="text-base font-semibold">Wallpaper Gallery</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            {/* Wallpaper Source Tabs */}
            <div className="flex items-center justify-center mb-5">
              <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/10">
                <button
                  onClick={() => setActiveTab('curated')}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                    activeTab === 'curated' ? 'bg-white text-black font-semibold' : 'text-white/70 hover:text-white'
                  }`}
                >
                  Curated
                </button>
                <button
                  onClick={() => setActiveTab('gradients')}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                    activeTab === 'gradients' ? 'bg-white text-black font-semibold' : 'text-white/70 hover:text-white'
                  }`}
                >
                  Gradients
                </button>
                <button
                  onClick={() => setActiveTab('unsplash')}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                    activeTab === 'unsplash' ? 'bg-white text-black font-semibold' : 'text-white/70 hover:text-white'
                  }`}
                >
                  Photos
                </button>
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                    activeTab === 'upload' ? 'bg-white text-black font-semibold' : 'text-white/70 hover:text-white'
                  }`}
                >
                  Upload
                </button>
              </div>
            </div>

            {/* Curated Artworks Tab */}
            {activeTab === 'curated' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {CURATED_WALLPAPERS.map((item) => {
                  const isSelected = currentWallpaper.value === item.url;
                  return (
                    <button
                      key={item.id}
                      onClick={() =>
                        onSelectWallpaper({
                          type: 'curated',
                          value: item.url,
                          thumb: item.url,
                          credit: item.credit,
                        })
                      }
                      className={`group relative h-32 rounded-2xl overflow-hidden border text-left transition-all duration-300 ${
                        isSelected
                          ? 'border-teal-400 ring-2 ring-teal-400/50 shadow-xl scale-[1.02]'
                          : 'border-white/15 hover:border-white/40 hover:scale-[1.01]'
                      }`}
                    >
                      <img
                        src={item.url}
                        alt={item.name}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3 z-10">
                        <span className="block text-xs font-bold text-white tracking-wide">
                          {item.name}
                        </span>
                        <span className="block text-[10px] text-white/70 truncate">
                          {item.subtitle}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="absolute top-2.5 right-2.5 z-10 w-5 h-5 rounded-full bg-teal-400 text-black flex items-center justify-center shadow-lg font-bold">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Gradients Tab */}
            {activeTab === 'gradients' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {BUNDLED_WALLPAPERS.map((g) => {
                  const isSelected = currentWallpaper.type === 'gradient' && currentWallpaper.value === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => onSelectWallpaper({ type: 'gradient', value: g.id })}
                      className="group relative h-24 rounded-2xl overflow-hidden border border-white/15 p-3 flex flex-col justify-end text-left hover:scale-[1.03] transition-all"
                      style={{ background: g.css }}
                    >
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                      <span className="relative z-10 text-xs font-semibold text-white drop-shadow-md">
                        {g.name}
                      </span>
                      {isSelected && (
                        <div className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-white text-black flex items-center justify-center shadow-md">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Unsplash Photos Tab */}
            {activeTab === 'unsplash' && (
              <div className="space-y-4">
                {/* Category Pills */}
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {UNSPLASH_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setUnsplashCategory(cat)}
                      className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-all shrink-0 ${
                        unsplashCategory === cat
                          ? 'bg-white text-black font-semibold'
                          : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Loading state */}
                {isLoadingPhotos && (
                  <div className="h-48 flex items-center justify-center text-white/50 gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-xs">Fetching wallpapers...</span>
                  </div>
                )}

                {/* Not configured warning */}
                {!isLoadingPhotos && unsplashNotConfigured && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                    <Sparkles className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                    <h4 className="text-sm font-semibold mb-1">Unsplash API Key Not Configured</h4>
                    <p className="text-xs text-white/60 max-w-sm mx-auto mb-4">
                      Add <code className="bg-black/40 px-1.5 py-0.5 rounded text-white font-mono">UNSPLASH_ACCESS_KEY</code> in server <code className="bg-black/40 px-1.5 py-0.5 rounded text-white font-mono">.env</code> to enable live Unsplash browsing.
                    </p>
                    <button
                      onClick={() => setActiveTab('gradients')}
                      className="px-4 py-2 bg-white text-black text-xs font-semibold rounded-xl hover:bg-white/90 transition-colors"
                    >
                      Use Bundled Gradients
                    </button>
                  </div>
                )}

                {/* Photo Grid */}
                {!isLoadingPhotos && !unsplashNotConfigured && photos.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    {photos.map((photo: any) => {
                      const isSelected = currentWallpaper.value === photo.url;
                      return (
                        <div
                          key={photo.id}
                          onClick={() =>
                            onSelectWallpaper({
                              type: 'unsplash',
                              value: photo.url,
                              thumb: photo.thumb,
                              credit: photo.credit,
                              creditUrl: photo.creditUrl,
                            })
                          }
                          className="group relative h-36 rounded-2xl overflow-hidden border border-white/15 cursor-pointer hover:scale-[1.02] transition-all bg-black/40"
                        >
                          <img
                            src={photo.thumb}
                            alt={photo.credit}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 p-3 flex flex-col justify-between" />
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                              <Check className="w-4 h-4 stroke-[3]" />
                            </div>
                          )}
                          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] text-white/80">
                            <span className="truncate">{photo.credit}</span>
                            <a
                              href={photo.creditUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 hover:text-white"
                              title="View on Unsplash"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Custom Upload Tab */}
            {activeTab === 'upload' && (
              <div className="border-2 border-dashed border-white/20 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:border-white/40 transition-colors">
                <Upload className="w-8 h-8 text-white/60 mb-3" />
                <h4 className="text-sm font-semibold mb-1">Upload Wallpaper</h4>
                <p className="text-xs text-white/50 max-w-xs mb-4">
                  Upload any JPG, PNG, or WebP photo to set as your personal focus background.
                </p>
                <label className="cursor-pointer px-4 py-2 bg-white text-black font-semibold text-xs rounded-xl hover:bg-white/90 transition-all flex items-center gap-2">
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <span>Choose File</span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black/30 flex items-center justify-between text-xs text-white/50">
          <span>Saved to your personal preferences automatically</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white text-black font-semibold rounded-xl hover:bg-white/90 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
