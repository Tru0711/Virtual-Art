import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import image1 from "../../assets/img4.png";

export default function HeroSection() {
    const [imageLoaded, setImageLoaded] = useState(false);
    const imgRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const img = new Image();
        img.src = image1;

        const handleLoad = () => {
            setImageLoaded(true);
        };

        const handleError = () => {
            setImageLoaded(true); // Hide shimmer even on error
        };

        img.addEventListener('load', handleLoad);
        img.addEventListener('error', handleError);

        // Check if already loaded (for cached images)
        if (img.complete && img.naturalHeight !== 0) {
            setImageLoaded(true);
        }

        // Fallback: hide shimmer after 5 seconds to prevent infinite loading
        const timeout = setTimeout(() => {
            setImageLoaded(true);
        }, 5000);

        // Cleanup
        return () => {
            img.removeEventListener('load', handleLoad);
            img.removeEventListener('error', handleError);
            clearTimeout(timeout);
        };
    }, []);

    return (
        <div className="relative bg-gradient-to-br from-amber-50 via-white to-rose-50 py-20 overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
                {!imageLoaded && (
                    <div className="w-full h-full bg-gray-200 animate-pulse"></div>
                )}
                <img
                    ref={imgRef}
                    src={image1}
                    alt="Hero background"
                    className="w-full h-full object-cover opacity-70"
                    style={{ display: imageLoaded ? 'block' : 'none' }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-amber-50/40 via-white/20 to-rose-50/40"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h1 className="text-6xl md:text-7xl font-bold text-gray-800 mb-4">
                    <span className="text-amber-600">Virtual</span>
                    <span className="text-rose-600">Art</span>
                </h1>
                <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                    Discover, collect, and sell extraordinary artworks from talented artists around the world.
                    Your gateway to the digital art marketplace.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={() => navigate('/search')}
                        className="px-8 py-3 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-lg hover:shadow-lg transition-shadow font-semibold"
                    >
                        Explore Artworks
                    </button>
                    <button
                        onClick={() => navigate('/login/user')}
                        className="px-8 py-3 border-2 border-amber-500 text-amber-600 rounded-lg hover:bg-amber-50 transition-colors font-semibold flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        AR Experience
                    </button>
                </div>
            </div>
        </div>
    );
}
