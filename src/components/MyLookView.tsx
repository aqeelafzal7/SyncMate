import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Camera, 
  Upload, 
  Loader2, 
  CheckCircle2, 
  TrendingUp, 
  Scissors, 
  UserCheck, 
  Activity, 
  ShieldCheck, 
  History, 
  Calendar, 
  Shirt, 
  RefreshCw, 
  X, 
  ChevronRight,
  Eye,
  Award
} from 'lucide-react';
import { MyLookReport, StyleLog, WardrobeItem, UserProfile } from '../types';
import { uploadMyLookPhoto, addMyLookReportToFirestore } from '../lib/firebase';

interface MyLookViewProps {
  myLookReports: MyLookReport[];
  styleLogs: StyleLog[];
  wardrobeItems: WardrobeItem[];
  userProfile: UserProfile | null;
  onGoToStylist: () => void;
}

// Curated high quality reference visualizer photos for barbers/stylists
const HAIRCUT_VISUAL_REFERENCES: Record<string, string[]> = {
  default: [
    "https://images.unsplash.com/photo-1503443207922-dff7d543fd0e?w=500&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=500&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=500&auto=format&fit=crop&q=80"
  ],
  fade: [
    "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=500&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=500&auto=format&fit=crop&q=80"
  ],
  quiff: [
    "https://images.unsplash.com/photo-1503443207922-dff7d543fd0e?w=500&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=500&auto=format&fit=crop&q=80"
  ],
  taper: [
    "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=500&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80"
  ]
};

export const MyLookView: React.FC<MyLookViewProps> = ({
  myLookReports,
  styleLogs,
  wardrobeItems,
  userProfile,
  onGoToStylist
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'biometrics' | 'outfit_history'>('biometrics');
  
  // Photo & Camera State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Scanning State
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanStep, setScanStep] = useState<string>('Initializing Biometric Lens...');

  // Progress Insight State
  const [progressInsight, setProgressInsight] = useState<string | null>(null);
  const [comparingProgress, setComparingProgress] = useState<boolean>(false);

  // Start Camera
  const startCamera = async () => {
    setIsCameraActive(true);
    setSelectedImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Webcam permission denied or unavailable:', err);
      setIsCameraActive(false);
      alert('Unable to access camera. Please use the photo upload button instead.');
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Capture Photo from Camera
  const captureCameraPhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setSelectedImage(dataUrl);
        stopCamera();
      }
    }
  };

  // Handle Local File Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  // Run Biometrics Scan
  const handleAnalyzeBiometrics = async () => {
    if (!selectedImage || !userProfile?.uid) return;
    setIsScanning(true);
    setScanStep('Mapping Facial Keypoints...');

    const steps = [
      'Mapping Facial Keypoints...',
      'Evaluating Shoulder Symmetry & Posture...',
      'Analyzing Beard Trim & Hairline Structure...',
      'Calculating Overall Biometric Score...'
    ];

    let stepIdx = 0;
    const interval = setInterval(() => {
      stepIdx++;
      if (stepIdx < steps.length) {
        setScanStep(steps[stepIdx]);
      }
    }, 1000);

    try {
      const customApiKey = localStorage.getItem('syncmate_gemini_api_key') || undefined;

      // 1. Send image to Gemini Vision Endpoint
      const res = await fetch('/api/my-look/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: selectedImage,
          customApiKey
        })
      });

      clearInterval(interval);

      if (res.ok) {
        const data = await res.json();
        if (data.report) {
          // 2. Upload photo to Firebase Storage (user_photos/{userId}/)
          const photoStorageUrl = await uploadMyLookPhoto(userProfile.uid, selectedImage);

          // 3. Save to Firestore collection 'my_look_reports'
          await addMyLookReportToFirestore({
            userId: userProfile.uid,
            imageUrl: photoStorageUrl,
            faceShape: data.report.faceShape || 'Oval',
            groomingFeedback: data.report.groomingFeedback || 'Clean styling and healthy skin tone.',
            suggestedHaircut: data.report.suggestedHaircut || 'Taper Fade Executive Contour',
            suggestedBeard: data.report.suggestedBeard || 'Tailored Boxed Beard',
            fitnessPosture: data.report.fitnessPosture || 'Upright, symmetrical posture.',
            overallScore: data.report.overallScore || 88
          });

          setSelectedImage(null);
        }
      }
    } catch (err) {
      console.error('Error analyzing biometrics:', err);
      clearInterval(interval);
    } finally {
      setIsScanning(false);
    }
  };

  // Trigger Progress Comparison if >= 2 Reports exist
  useEffect(() => {
    async function compareReports() {
      if (myLookReports.length >= 2 && !progressInsight && !comparingProgress) {
        setComparingProgress(true);
        try {
          const customApiKey = localStorage.getItem('syncmate_gemini_api_key') || undefined;
          const newReport = myLookReports[0];
          const previousReport = myLookReports[1];

          const res = await fetch('/api/my-look/compare', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              previousReport,
              newReport,
              customApiKey
            })
          });

          if (res.ok) {
            const data = await res.json();
            if (data.progressSummary) {
              setProgressInsight(data.progressSummary);
            }
          }
        } catch (err) {
          console.warn('Comparison endpoint error:', err);
        } finally {
          setComparingProgress(false);
        }
      }
    }
    compareReports();
  }, [myLookReports]);

  const latestReport = myLookReports.length > 0 ? myLookReports[0] : null;

  // Select Reference photos based on haircut keyword
  const getHaircutReferences = (haircutName: string) => {
    const lower = (haircutName || '').toLowerCase();
    if (lower.includes('fade')) return HAIRCUT_VISUAL_REFERENCES.fade;
    if (lower.includes('quiff')) return HAIRCUT_VISUAL_REFERENCES.quiff;
    if (lower.includes('taper')) return HAIRCUT_VISUAL_REFERENCES.taper;
    return HAIRCUT_VISUAL_REFERENCES.default;
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todayLog = styleLogs.find((log) => log.date === todayStr);

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 border border-cyan-500/40 text-white shadow-lg shadow-cyan-500/20">
            <Activity className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center space-x-2">
              <span>My Look & Biometric Tracker</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 uppercase tracking-wider">
                Multimodal AI Vision
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Facial shape recognition, posture alignment analysis, and personalized barber style visualizer.
            </p>
          </div>
        </div>

        {/* Sub-tab Switcher */}
        <div className="flex items-center space-x-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/80 shrink-0">
          <button
            onClick={() => setActiveSubTab('biometrics')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeSubTab === 'biometrics'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Biometrics Check-In</span>
          </button>
          <button
            onClick={() => setActiveSubTab('outfit_history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeSubTab === 'outfit_history'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shirt className="w-4 h-4" />
            <span>Outfit Style Logs</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'biometrics' && (
        <div className="space-y-6">
          
          {/* UPLOAD & CAMERA SCANNER CARD */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6 gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Camera className="w-5 h-5 text-cyan-500" />
                  <span>Biometric Photo Check-In</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Take a selfie or upload a photo to evaluate facial structure, grooming, and upper posture.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 shrink-0">
                {!isCameraActive ? (
                  <button
                    onClick={startCamera}
                    className="px-4 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs shadow-md shadow-cyan-600/20 flex items-center space-x-1.5 transition-all"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Open Camera</span>
                  </button>
                ) : (
                  <button
                    onClick={stopCamera}
                    className="px-4 py-2.5 rounded-2xl bg-slate-800 text-slate-300 font-bold text-xs flex items-center space-x-1.5 hover:bg-slate-700"
                  >
                    <X className="w-4 h-4" />
                    <span>Close Camera</span>
                  </button>
                )}

                <label className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer border border-slate-200 dark:border-slate-700 flex items-center space-x-1.5 transition-all">
                  <Upload className="w-4 h-4 text-cyan-500" />
                  <span>Upload Photo</span>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
              </div>
            </div>

            {/* CAMERA PREVIEW MODE */}
            {isCameraActive && (
              <div className="mb-6 max-w-md mx-auto relative rounded-3xl overflow-hidden border-2 border-cyan-500 shadow-2xl bg-black">
                <video ref={videoRef} autoPlay playsInline className="w-full h-72 object-cover" />
                
                {/* HUD Overlay Frame */}
                <div className="absolute inset-0 border-2 border-cyan-400/40 rounded-3xl pointer-events-none flex flex-col justify-between p-4">
                  <div className="flex justify-between text-[10px] text-cyan-400 font-mono font-bold">
                    <span>[LENS ACTIVE]</span>
                    <span>ALIGN FACE CENTER</span>
                  </div>
                  <div className="w-24 h-24 border-2 border-dashed border-cyan-400/60 rounded-full mx-auto" />
                  <div className="text-center text-[10px] text-cyan-300 font-mono">
                    READY FOR CHECK-IN
                  </div>
                </div>

                <button
                  onClick={captureCameraPhoto}
                  className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-6 py-2.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-lg flex items-center space-x-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>SNAP CHECK-IN</span>
                </button>
              </div>
            )}

            {/* PREVIEW & SCANNING VIEW */}
            {selectedImage && !isCameraActive && (
              <div className="p-4 rounded-3xl bg-slate-950 border border-slate-800 text-white max-w-lg mx-auto space-y-4">
                
                <div className="relative rounded-2xl overflow-hidden aspect-square max-h-72 bg-black border border-slate-800">
                  <img src={selectedImage} alt="Biometric preview" className="w-full h-full object-cover" />

                  {/* FUTURISTIC SCANNING ANIMATION OVERLAY */}
                  {isScanning && (
                    <div className="absolute inset-0 bg-cyan-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
                      
                      {/* Laser Line */}
                      <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-lg shadow-cyan-400 animate-pulse top-1/2" />
                      
                      {/* Radar Ring */}
                      <div className="w-20 h-20 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mb-4" />

                      <p className="font-black text-sm text-cyan-300 tracking-wider uppercase font-mono animate-pulse">
                        {scanStep}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Multimodal Gemini AI Vision Engine
                      </p>
                    </div>
                  )}
                </div>

                {!isScanning && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedImage(null)}
                      className="w-1/3 py-3 rounded-2xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700"
                    >
                      Discard
                    </button>
                    <button
                      onClick={handleAnalyzeBiometrics}
                      className="w-2/3 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs shadow-lg shadow-cyan-500/30 flex items-center justify-center space-x-2"
                    >
                      <Activity className="w-4 h-4" />
                      <span>Start Biometric Scan</span>
                    </button>
                  </div>
                )}

              </div>
            )}

            {!selectedImage && !isCameraActive && (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/50">
                <Camera className="w-10 h-10 text-cyan-500 mx-auto mb-2 animate-pulse" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Ready for Physical & Grooming Check-In
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                  Click "Open Camera" or "Upload Photo" above to analyze face shape, beard line, hair styling, and posture alignment.
                </p>
              </div>
            )}

          </div>

          {/* PROGRESS INSIGHT CARD (IF > 1 REPORT EXISTS) */}
          {progressInsight && (
            <div className="p-5 rounded-3xl bg-gradient-to-r from-cyan-900/60 via-slate-900 to-slate-950 border border-cyan-500/40 text-white shadow-xl animate-fadeIn">
              <div className="flex items-center space-x-2 text-cyan-400 font-extrabold text-xs uppercase tracking-wider mb-2">
                <TrendingUp className="w-4 h-4" />
                <span>📈 Progress Insight (Comparison Check-In)</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed italic">
                "{progressInsight}"
              </p>
            </div>
          )}

          {/* LATEST BIOMETRIC REPORT CARD */}
          {latestReport ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
              
              {/* Header Score & Face Shape */}
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800 gap-4">
                <div className="flex items-center space-x-4">
                  <img
                    src={latestReport.imageUrl}
                    alt="Biometric check-in"
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-cyan-500/60 shadow-md shrink-0"
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 uppercase">
                        Face Shape: {latestReport.faceShape}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {new Date(latestReport.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                      Latest Physical Check-In Report
                    </h3>
                  </div>
                </div>

                <div className="flex items-center space-x-3 bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-800 shrink-0">
                  <Award className="w-8 h-8 text-amber-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-extrabold block">
                      Overall Score
                    </span>
                    <span className="text-2xl font-black text-amber-400 leading-none">
                      {latestReport.overallScore}<span className="text-xs text-slate-400 font-semibold">/100</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Evaluation Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                  <div className="flex items-center space-x-2 text-xs font-extrabold text-indigo-600 dark:text-indigo-400 mb-2">
                    <UserCheck className="w-4 h-4" />
                    <span>Grooming & Skin Contrast</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {latestReport.groomingFeedback}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                  <div className="flex items-center space-x-2 text-xs font-extrabold text-emerald-600 dark:text-emerald-400 mb-2">
                    <Activity className="w-4 h-4" />
                    <span>Fitness & Posture Observations</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {latestReport.fitnessPosture}
                  </p>
                </div>

              </div>

              {/* BARBER / STYLIST VISUALIZER PLACEHOLDERS */}
              <div className="p-6 rounded-3xl bg-slate-950 text-white border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <Scissors className="w-5 h-5 text-cyan-400" />
                    <h4 className="font-extrabold text-sm text-white">
                      Barber & Stylist Visualizer References
                    </h4>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-mono font-bold">
                    Show this to your barber
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">
                      Suggested Haircut:
                    </span>
                    <p className="text-xs font-bold text-cyan-300 mb-3">
                      ✂️ {latestReport.suggestedHaircut}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {getHaircutReferences(latestReport.suggestedHaircut).map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt="Haircut reference"
                          className="w-full h-24 rounded-xl object-cover border border-slate-700"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">
                      Suggested Beard Style:
                    </span>
                    <p className="text-xs font-bold text-cyan-300 mb-3">
                      🧔 {latestReport.suggestedBeard}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <img
                        src="https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=500&auto=format&fit=crop&q=80"
                        alt="Beard style reference"
                        className="w-full h-24 rounded-xl object-cover border border-slate-700"
                      />
                      <img
                        src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80"
                        alt="Beard style reference"
                        className="w-full h-24 rounded-xl object-cover border border-slate-700"
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="p-10 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
              <Activity className="w-12 h-12 text-cyan-500 mx-auto mb-3 animate-bounce" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                No Biometric Check-Ins Yet
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                Take your first selfie or full-body photo above to generate your initial grooming score, face shape analysis, and posture evaluation.
              </p>
            </div>
          )}

          {/* PROGRESS DASHBOARD HISTORY */}
          {myLookReports.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl">
              <h3 className="font-bold text-slate-900 dark:text-white text-base mb-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <History className="w-4 h-4 text-cyan-500" />
                  <span>Biometric Progress History</span>
                </span>
                <span className="text-xs text-slate-400 font-normal">{myLookReports.length} Reports</span>
              </h3>

              <div className="space-y-3">
                {myLookReports.map((report) => (
                  <div
                    key={report.id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={report.imageUrl}
                        alt="Check-in thumbnail"
                        className="w-12 h-12 rounded-xl object-cover border border-slate-300 dark:border-slate-600"
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            Score: {report.overallScore}/100
                          </span>
                          <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold bg-cyan-50 dark:bg-cyan-950 px-2 py-0.5 rounded-md">
                            {report.faceShape}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate max-w-xs sm:max-w-md mt-0.5">
                          {report.suggestedHaircut} • {report.suggestedBeard}
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] font-medium text-slate-400 shrink-0">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* OUTFIT STYLE LOGS TAB */}
      {activeSubTab === 'outfit_history' && (
        <div className="space-y-6">
          
          {/* Today's Active Outfit */}
          {todayLog ? (
            <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 border border-indigo-500/30 rounded-3xl p-6 md:p-8 text-white shadow-2xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-indigo-800/60 mb-6 gap-4">
                <div>
                  <span className="px-3 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider inline-flex items-center space-x-1 mb-2">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Today's Active Outfit</span>
                  </span>
                  <h3 className="text-2xl font-black text-white">
                    {todayLog.outfitTitle}
                  </h3>
                  <p className="text-xs text-indigo-300 font-semibold mt-1">
                    Vibe: {todayLog.vibe}
                  </p>
                </div>

                <div className="text-xs text-slate-400 flex items-center space-x-2 bg-slate-800/80 px-4 py-2 rounded-2xl border border-slate-700/80 shrink-0">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  <span>{todayLog.date}</span>
                </div>
              </div>

              <div className="mb-6 p-4 rounded-2xl bg-indigo-950/60 border border-indigo-800/50 text-xs sm:text-sm text-indigo-100 italic">
                "{todayLog.styleNotes}"
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
              <Shirt className="w-12 h-12 text-indigo-500 mx-auto mb-3 animate-pulse" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                No Outfit Logged For Today Yet
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-5">
                Lock in your daily style from your clean closet using the Today Wear Engine.
              </p>
              <button
                onClick={onGoToStylist}
                className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md inline-flex items-center space-x-2"
              >
                <span>Open AI Stylist Engine</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Style Logs List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl">
            <h3 className="font-bold text-slate-900 dark:text-white text-base mb-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span>Style Log History</span>
              <span className="text-xs text-slate-400 font-normal">{styleLogs.length} Total Logs</span>
            </h3>

            {styleLogs.length > 0 ? (
              <div className="space-y-3">
                {styleLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {log.outfitTitle}
                        </span>
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-md">
                          {log.date}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                        "{log.styleNotes}"
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-6">
                Your style history will appear here as you log outfits each day.
              </p>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
