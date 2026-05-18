import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { resolveArtworkImageUrl } from '../../lib/imageUtils';
import img1 from "../../assets/img1.png";
import img2 from "../../assets/img2.png";
import img3 from "../../assets/img3.png";

export default function LatestCreations() {
    const [artworks, setArtworks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLatestArtworks();
    }, []);

    const fetchLatestArtworks = async () => {
        try {
            setLoading(true);
            const response = await api.getPublicArtworks();
            const latestThree = Array.isArray(response) ? response.slice(0, 3) : [];
            setArtworks(latestThree);
        } catch (error) {
            console.error('Error fetching artworks:', error);
            // Fallback to static images if fetch fails
            setArtworks([]);
        } finally {
            setLoading(false);
        }
    };

    // Fallback images
    const fallbackImages = [
        { img: img1, title: "Abstract Emotions", description: "A captivating abstract piece that explores the depths of human emotion through vibrant colors and dynamic brushstrokes." },
        { img: img2, title: "Serene Dawn", description: "A serene landscape painting that captures the tranquility of nature at dawn. Soft pastel colors blend seamlessly to create a sense of calm and renewal." },
        { img: img3, title: "Contemporary Forms", description: "A bold contemporary sculpture that challenges traditional forms. Using industrial materials, this piece represents the intersection of technology and human creativity." }
    ];

    const displayArtworks = artworks.length > 0 ? artworks : fallbackImages;

    const resolveArtworkImage = (item, index) => {
        const resolved = resolveArtworkImageUrl(item);
        if (resolved) return resolved;
        if (item?.img) return item.img;
        return fallbackImages[index]?.img || null;
    };

    return (
        <>
            {/* Poppins Font */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@200;300;400;500;600;700;800;900&display=swap');

                * {
                    font-family: 'Poppins', sans-serif;
                }
            `}</style>

            <div className="text-center mb-8">
                <h1 className="text-3xl font-semibold text-gray-800 mb-2">
                    Featured Artworks
                </h1>
                <p className="text-sm text-slate-500 max-w-lg mx-auto">
                    Discover the latest masterpieces from our talented artists. Each piece tells a unique story and brings art to life.
                </p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-[400px]">
                    <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="flex items-center justify-center gap-6 h-[400px] w-full max-w-5xl mx-auto mb-12">
                    {displayArtworks.map((item, index) => {
                        const imageUrl = resolveArtworkImage(item, index);
                        const title = item.title || `Artwork ${index + 1}`;
                        const description = item.description || 'A beautiful piece of art.';

                        return (
                            <div 
                                key={index} 
                                className="relative group flex-grow transition-all w-56 h-[400px] duration-500 hover:w-full cursor-default"
                            >
                                <img
                                    className="h-full w-full object-cover"
                                    src={imageUrl}
                                    alt={title}
                                    onError={(e) => {
                                        e.currentTarget.src = fallbackImages[index].img;
                                    }}
                                />
                                <div className="absolute inset-0 flex flex-col justify-end p-10 text-white bg-black/50
                                                opacity-0 group-hover:opacity-100 transition-all duration-300">
                                    <h1 className="text-3xl font-semibold mb-2">{title}</h1>
                                    <p className="text-sm">{description}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
}
