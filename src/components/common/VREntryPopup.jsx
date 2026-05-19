import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Loader } from 'lucide-react';

const VREntryPopup = ({ isOpen, artistId, galleryId, onClose }) => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!isOpen) return;

    void import('../pages/VRGallery.jsx');

    const startTime = Date.now();
    const duration = 4000; // 4 seconds

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      const percent = (remaining / duration) * 100;
      setProgress(percent);

      if (elapsed >= duration) {
        clearInterval(interval);
        handleComplete();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isOpen]);

  const handleComplete = () => {
    const route = galleryId 
      ? `/vr-gallery/${artistId}/${galleryId}` 
      : `/vr-gallery/${artistId}`;
    navigate(route);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Blurred Background Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Popup Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
          >
            <motion.div
              className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-black rounded-2xl border border-white/10 backdrop-blur-xl shadow-2xl p-8 max-w-md w-full"
              style={{
                boxShadow: '0 0 60px rgba(59, 130, 246, 0.1), 0 0 30px rgba(255, 255, 255, 0.05)',
              }}
            >
              {/* Decorative gradient border */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/20 via-transparent to-cyan-500/20 pointer-events-none" />

              {/* Content */}
              <div className="relative z-10">
                {/* Spinner */}
                <div className="flex justify-center mb-6">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    <Loader className="h-12 w-12 text-cyan-400" strokeWidth={1.5} />
                  </motion.div>
                </div>

                {/* Main Text */}
                <h2 className="text-2xl font-bold text-center text-white mb-4">
                  Entering VR Gallery...
                </h2>

                {/* Description */}
                <div className="text-center space-y-4 mb-8">
                  <p className="text-gray-200 leading-relaxed">
                    This VR environment uses adapted Creative Commons (CC BY 4.0) assets.
                  </p>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Gallery assets have been optimized and integrated into the VisualArt immersive experience.
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="relative h-1 bg-white/10 rounded-full overflow-hidden mb-4">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400"
                    initial={{ width: '100%' }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.05, ease: 'linear' }}
                  />
                </div>

                {/* Timer Text */}
                <p className="text-center text-xs text-gray-400">
                  Redirecting in {Math.ceil(progress / 25)}s
                </p>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default VREntryPopup;
