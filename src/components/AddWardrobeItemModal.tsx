import React, { useState, useCallback } from 'react';
import Cropper, { Point, Area } from 'react-easy-crop';
import { X, ZoomIn, ZoomOut, Loader2, Sparkles, Shirt, Crop } from 'lucide-react';
import { uploadToImgBB } from '../lib/firebase';

interface AddWardrobeItemModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  initialFileName?: string;
  onClose: () => void;
  onSuccess: (newItem: {
    title: string;
    category: string;
    description: string;
    imgbbUrl: string;
  }) => Promise<void>;
  userId: string;
}

const CATEGORY_OPTIONS = [
  'Tops',
  'Bottoms',
  'Traditional',
  'Footwear',
  'Watches',
  'Glasses',
  'Accessories'
];

/**
 * Canvas utility to extract cropped image Blob from imageSrc & pixelCrop coords
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area
): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', (err) => reject(err));
    img.setAttribute('crossOrigin', 'anonymous');
    img.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas export failed'));
        }
      },
      'image/jpeg',
      0.95
    );
  });
}

export const AddWardrobeItemModal: React.FC<AddWardrobeItemModalProps> = ({
  isOpen,
  imageSrc,
  initialFileName = '',
  onClose,
  onSuccess,
  userId
}) => {
  if (!isOpen || !imageSrc) return null;

  // Cropper state
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [aspect, setAspect] = useState<number>(1); // 1:1 default

  // Form state
  const defaultTitle = initialFileName
    ? initialFileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
    : '';
  const formattedDefaultTitle = defaultTitle
    ? defaultTitle.charAt(0).toUpperCase() + defaultTitle.slice(1)
    : '';

  const [title, setTitle] = useState<string>(formattedDefaultTitle || '');
  const [category, setCategory] = useState<string>('Tops');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please enter an item title');
      return;
    }
    if (!croppedAreaPixels) {
      setErrorMsg('Please crop the image before uploading');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // 1. Extract cropped Blob via HTML5 Canvas
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);

      // 2. Upload cropped Blob directly to ImgBB
      const imgbbUrl = await uploadToImgBB(croppedBlob);
      if (!imgbbUrl) {
        throw new Error('Image upload failed. Please try again.');
      }

      // 3. Callback to write to Firestore & update UI
      await onSuccess({
        title: title.trim(),
        category,
        description: description.trim(),
        imgbbUrl
      });

      onClose();
    } catch (err: any) {
      console.error('Error uploading wardrobe item:', err);
      setErrorMsg(err.message || 'Failed to process and upload item. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 max-w-4xl w-full shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Shirt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white flex items-center space-x-2">
                <span>Add Wardrobe Item</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                  Gatekeeper Review
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Isolate clothing item with cropper and provide details before uploading to closet.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-all disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          
          {/* LEFT SIDE: Image Cropper */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Crop className="w-3.5 h-3.5 text-indigo-400" />
                <span>Isolate & Crop Item</span>
              </label>

              {/* Aspect Ratio Selector */}
              <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setAspect(1)}
                  className={`px-2 py-0.5 rounded-lg transition-all ${
                    aspect === 1 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  1:1 Square
                </button>
                <button
                  type="button"
                  onClick={() => setAspect(3 / 4)}
                  className={`px-2 py-0.5 rounded-lg transition-all ${
                    aspect === 3 / 4 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  3:4 Portrait
                </button>
              </div>
            </div>

            {/* Cropper Box */}
            <div className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                objectFit="contain"
              />
            </div>

            {/* Zoom Slider Controls */}
            <div className="flex items-center space-x-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <ZoomOut className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-label="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <ZoomIn className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs font-mono text-indigo-300 w-10 text-right">
                {Math.round(zoom * 100)}%
              </span>
            </div>
          </div>

          {/* RIGHT SIDE: Item Details Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Item Title */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-300">
                Item Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder='e.g., "Navy Blue Chinos" or "Silk Paisley Tie"'
                className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-300">
                Category <span className="text-rose-400">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-300">
                Description
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add any specific details, material, fit, or when you prefer to wear this..."
                className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600 resize-none"
              />
            </div>

            {/* Information Notice */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
              <p className="font-semibold text-indigo-300 flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>ImgBB & Digital Wardrobe Pipeline</span>
              </p>
              <p>
                Cropped image will be uploaded directly to ImgBB and registered to your personal Firestore closet with "clean" status.
              </p>
            </div>

            {/* Submit Actions */}
            <div className="pt-2 flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="w-1/3 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-2/3 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all transform active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-200" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Shirt className="w-4 h-4 text-indigo-200" />
                    <span>Upload to Wardrobe</span>
                  </>
                )}
              </button>
            </div>

          </form>

        </div>

      </div>
    </div>
  );
};
