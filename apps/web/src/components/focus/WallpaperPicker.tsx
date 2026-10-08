import { useAuth } from '../../contexts/AuthContext';
import { focusStorageKey } from '../../lib/focusStorage';
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Upload, Check, ExternalLink, Sparkles, Palette, Loader2, Trash2 } from 'lucide-react';
import { api } from '../../api/client';
import { toast } from 'sonner';
import type { WallpaperConfig, LayoutName } from './types';
import { BUNDLED_WALLPAPERS, CURATED_WALLPAPERS } from './constants';
;

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
  currentLayout,
  onSelectWallpaper,
  onSelectLayout,
  onClose,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'curated' | 'gradients' | 'unsplash' | 'upload'>(() => {
    return currentWallpaper.type === 'upload' ? 'upload' : 'curated';
  });
  const [unsplashCategory, setUnsplashCategory] = useState<string>('nature');
  const [photos, setPhotos] = useState<any[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [unsplashNotConfigured, setUnsplashNotConfigured] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const uploadCapabilities = useQuery({ queryKey: ['upload-capabilities'], queryFn: api.upload.capabilities, enabled: activeTab === 'upload' });
  const canUpload = uploadCapabilities.data?.uploadAvailable === true;
  const uploadsComingSoon = uploadCapabilities.isSuccess && !canUpload;

  // Saved uploaded wallpapers history
  const [customWallpapers, setCustomWallpapers] = useState<WallpaperConfig[]>(() => {
    try {
      const saved = localStorage.getItem(focusStorageKey(user?.id, 'custom_wallpapers'));
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch { }
    if (currentWallpaper.type === 'upload') {
      return [currentWallpaper];
    }
    return [];
  });

  const displayedUploads = useMemo(() => {
    const list = [...customWallpapers];
    if (currentWallpaper.type === 'upload' && !list.some((w) => w.value === currentWallpaper.value)) {
      list.unshift(currentWallpaper);
    }
    return list;
  }, [customWallpapers, currentWallpaper]);

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
    if (!canUpload) return;

    try {
      setIsUploading(true);
      const res = await api.upload.file(file);
      if (res.url) {
        const newWp: WallpaperConfig = {
          type: 'upload',
          value: res.url,
          thumb: res.url,
          credit: file.name,
        };
        const updated = [newWp, ...customWallpapers.filter((w) => w.value !== res.url)];
        setCustomWallpapers(updated);
        try {
          localStorage.setItem(focusStorageKey(user?.id, 'custom_wallpapers'), JSON.stringify(updated));
        } catch { }

        onSelectWallpaper(newWp);
        toast.success('Custom wallpaper applied!');
      }
    } catch (err: any) {
      toast.error('Failed to upload image: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveWallpaper = (wallpaperValue: string) => {
    const updated = customWallpapers.filter((w) => w.value !== wallpaperValue);
    setCustomWallpapers(updated);
    try {
      localStorage.setItem(focusStorageKey(user?.id, 'custom_wallpapers'), JSON.stringify(updated));
    } catch { }

    // If removing the currently active wallpaper, restore default
    if (currentWallpaper.type === 'upload' && currentWallpaper.value === wallpaperValue) {
      const defaultWp: WallpaperConfig = {
        type: 'curated',
        value: '/wallpapers/lighthouse.png',
        thumb: '/wallpapers/lighthouse.png',
        credit: 'Solitary Beacon',
      };
      onSelectWallpaper(defaultWp);
      toast.success('Custom wallpaper removed. Restored default wallpaper.');
    } else {
      toast.success('Wallpaper removed from uploaded list.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl krama-dialog rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-primary">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/80">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-accent-fg" />
            <h2 className="text-base font-semibold text-primary">Wallpaper & Layout</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-hover text-muted hover:text-primary transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Layout Switcher */}
          {onSelectLayout && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-surface-2/60 border border-border">
              <div>
                <span className="text-xs font-semibold text-primary block">Timer Layout</span>
                <span className="text-[11px] text-muted">Choose typography & positioning</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(['standby', 'centered', 'card', 'overlay', 'sidebar', 'zen'] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => onSelectLayout(l)}
                    className={`px-3 py-1 rounded-xl text-xs font-medium capitalize transition-all cursor-pointer ${
                      currentLayout === l
                        ? 'bg-accent text-white font-semibold shadow-md'
                        : 'text-secondary hover:text-primary hover:bg-surface-hover'
                    }`}
                  >
                    {l === 'standby' ? 'Standby' : l === 'centered' ? 'Centered' : l === 'card' ? 'Card' : l === 'overlay' ? 'Overlay' : l === 'sidebar' ? 'Sidebar' : 'Zen'}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            {/* Wallpaper Source Tabs */}
            <div className="flex items-center justify-center mb-5">
              <div className="flex gap-1 p-1 bg-surface-2 rounded-xl border border-border">
                <button
                  onClick={() => setActiveTab('curated')}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                    activeTab === 'curated' ? 'bg-surface text-primary shadow-xs font-semibold' : 'text-secondary hover:text-primary'
                  }`}
                >
                  Curated
                </button>
                <button
                  onClick={() => setActiveTab('gradients')}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                    activeTab === 'gradients' ? 'bg-surface text-primary shadow-xs font-semibold' : 'text-secondary hover:text-primary'
                  }`}
                >
                  Gradients
                </button>
                <button
                  onClick={() => setActiveTab('unsplash')}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                    activeTab === 'unsplash' ? 'bg-surface text-primary shadow-xs font-semibold' : 'text-secondary hover:text-primary'
                  }`}
                >
                  Photos
                </button>
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                    activeTab === 'upload' ? 'bg-surface text-primary shadow-xs font-semibold' : 'text-secondary hover:text-primary'
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
                          ? 'border-accent ring-2 ring-accent/50 shadow-xl scale-[1.02]'
                          : 'border-border hover:border-border-strong hover:scale-[1.01]'
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
                        <div className="absolute top-2.5 right-2.5 z-10 w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center shadow-lg font-bold">
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
                      className="group relative h-24 rounded-2xl overflow-hidden border border-border p-3 flex flex-col justify-end text-left hover:scale-[1.03] transition-all cursor-pointer"
                      style={{ background: g.css }}
                    >
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                      <span className="relative z-10 text-xs font-semibold text-white drop-shadow-md">
                        {g.name}
                      </span>
                      {isSelected && (
                        <div className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center shadow-md">
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
                      className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-all shrink-0 cursor-pointer ${
                        unsplashCategory === cat
                          ? 'bg-accent text-white font-semibold'
                          : 'bg-surface-2 text-secondary hover:text-primary hover:bg-surface-hover border border-border'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Loading state */}
                {isLoadingPhotos && (
                  <div className="h-48 flex items-center justify-center text-muted gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-xs">Fetching wallpapers...</span>
                  </div>
                )}

                {/* Not configured warning */}
                {!isLoadingPhotos && unsplashNotConfigured && (
                  <div className="bg-surface-2 border border-border rounded-2xl p-6 text-center">
                    <Sparkles className="w-8 h-8 text-warning-fg mx-auto mb-2" />
                    <h4 className="text-sm font-semibold mb-1 text-primary">Unsplash API Key Not Configured</h4>
                    <p className="text-xs text-muted max-w-sm mx-auto mb-4">
                      Add <code className="bg-surface-3 px-1.5 py-0.5 rounded text-primary font-mono border border-border">UNSPLASH_ACCESS_KEY</code> in server <code className="bg-surface-3 px-1.5 py-0.5 rounded text-primary font-mono border border-border">.env</code> to enable live Unsplash browsing.
                    </p>
                    <button
                      onClick={() => setActiveTab('gradients')}
                      className="px-4 py-2 bg-accent text-white text-xs font-semibold rounded-xl hover:bg-accent-hover transition-colors cursor-pointer shadow-sm"
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
              <div className="space-y-6">
                {/* Uploaded Wallpapers Gallery */}
                {displayedUploads.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-white/70">
                        Your Custom Wallpapers ({displayedUploads.length})
                      </h4>
                      <span className="text-[11px] text-white/40">
                        Click card to apply • Click trash to remove
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {displayedUploads.map((wp, idx) => {
                        const isSelected = currentWallpaper.type === 'upload' && currentWallpaper.value === wp.value;
                        return (
                          <div
                            key={wp.value + idx}
                            onClick={() => onSelectWallpaper(wp)}
                            className={`group relative h-36 rounded-2xl overflow-hidden border transition-all cursor-pointer bg-surface-2/40 ${
                              isSelected
                                ? 'border-accent ring-2 ring-accent/30 shadow-lg'
                                : 'border-border hover:border-border-strong hover:scale-[1.01]'
                            }`}
                          >
                            <img
                              src={wp.value}
                              alt={wp.credit || 'Uploaded Wallpaper'}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30 p-3 flex flex-col justify-between" />

                            {/* Top row: Active indicator & Delete button */}
                            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
                              {isSelected ? (
                                <span className="flex items-center gap-1 text-[11px] font-semibold bg-accent text-white px-2.5 py-0.5 rounded-full shadow-md">
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  <span>Active</span>
                                </span>
                              ) : (
                                <span />
                              )}

                              {/* Remove Wallpaper Button */}
                              <button
                                type="button"
                                data-testid={`remove-wallpaper-${idx}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveWallpaper(wp.value);
                                }}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-1/80 hover:bg-danger-fg text-primary hover:text-white transition-all cursor-pointer shadow-lg backdrop-blur-md border border-border hover:border-danger-border text-xs font-medium active:scale-[0.98]"
                                title="Remove this wallpaper"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="text-[11px]">Remove</span>
                              </button>
                            </div>

                            {/* Bottom row: file title / name */}
                            <div className="absolute bottom-2.5 left-3 right-3 text-[11px] text-white/90 truncate font-medium z-10 drop-shadow">
                              {wp.credit || 'Custom Uploaded Wallpaper'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Upload New Wallpaper Card */}
                <div className="border-2 border-dashed border-border rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:border-accent/40 transition-colors bg-surface-2/30">
                  <Upload className="w-8 h-8 text-muted mb-2" />
                  <h4 className="text-sm font-semibold mb-1 text-primary">Upload Wallpaper</h4>
                  {uploadsComingSoon && <span className="mb-2 rounded-full border border-border bg-surface px-2 py-1 text-xs font-medium text-secondary">Coming soon</span>}
                  <p className="text-xs text-muted max-w-xs mb-4">
                    {uploadCapabilities.isError ? 'Upload availability could not be checked.' : uploadCapabilities.isLoading ? 'Checking upload availability…' : uploadsComingSoon ? 'Custom wallpaper uploads are coming soon. Use built-in wallpapers or gradients for now.' : 'Upload a JPG, PNG, GIF or WebP photo (up to 10 MB) as your focus background.'}
                  </p>
                  {uploadCapabilities.isError && <button className="text-accent text-xs mb-3" onClick={() => uploadCapabilities.refetch()}>Try again</button>}
                  <label className={`px-4 py-2 bg-accent text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-sm ${canUpload && !isUploading ? 'cursor-pointer hover:bg-accent-hover' : 'opacity-50 cursor-not-allowed'}`}>
                    {isUploading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <span>{uploadsComingSoon ? 'Coming soon' : 'Choose File'}</span>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleFileUpload}
                      disabled={isUploading || !canUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/80 bg-surface-2/40 flex items-center justify-between text-xs text-muted">
          <span>Saved to your personal preferences automatically</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-accent text-white font-semibold rounded-xl hover:bg-accent-hover transition-colors cursor-pointer shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
