import React, { useState, useEffect } from "react";

export default function Sidebar(props: any) {
    const [recommendations, setRecommendations] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showRecs, setShowRecs] = useState(false);

    useEffect(() => {
        if (props.selectedSong) {
            generateRecommendations(props.selectedSong);
        }
    }, [props.selectedSong]);

    const generateRecommendations = async (song: string) => {
        try {
            setLoading(true);
            setError(null);
            setShowRecs(true);
            
            const response = await fetch(`/api/recommendations?song=${encodeURIComponent(song)}`);
            const data = await response.json();
            
            if (data.error) {
                setError(data.error);
                setRecommendations([]);
            } else {
                setRecommendations(data.recommendations);
            }
        } catch (err) {
            setError("Failed to generate recommendations");
            setRecommendations([]);
        } finally {
            setLoading(false);
        }
    };

    const handleOnClick = () => {
        if (props.selectedSong) {
            generateRecommendations(props.selectedSong);
        } else {
            setError("Please select a song first by clicking on a song node");
            setShowRecs(true);
        }
    };

    return (
            <div id="sidebar" className="flex flex-col h-screen p-3 bg-gray-800 shadow col-span-1 grid grid-rows-2 space-y-1">
                <div className="row-span-1 space-y-2 flex flex-col">
                        <div className="flex items-center flex-shrink-0 text-white mr-6 text-xl font-bold">
                            <svg className="fill-current h-8 w-8 mr-2" width="54" height="54" viewBox="0 0 24 24" fill="#26A69A" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" clipRule="evenodd" d="M6 4.5C5.17157 4.5 4.5 5.17157 4.5 6C4.5 6.82843 5.17157 7.5 6 7.5C6.82843 7.5 7.5 6.82843 7.5 6C7.5 5.17157 6.82843 4.5 6 4.5ZM3.5 6C3.5 4.61929 4.61929 3.5 6 3.5C7.38071 3.5 8.5 4.61929 8.5 6C8.5 7.38071 7.38071 8.5 6 8.5C4.61929 8.5 3.5 7.38071 3.5 6Z" fill="teal-200"/>
                                <path fillRule="evenodd" clipRule="evenodd" d="M18 16.5C17.1716 16.5 16.5 17.1716 16.5 18C16.5 18.8284 17.1716 19.5 18 19.5C18.8284 19.5 19.5 18.8284 19.5 18C19.5 17.1716 18.8284 16.5 18 16.5ZM15.5 18C15.5 16.6193 16.6193 15.5 18 15.5C19.3807 15.5 20.5 16.6193 20.5 18C20.5 19.3807 19.3807 20.5 18 20.5C16.6193 20.5 15.5 19.3807 15.5 18Z" fill="teal-200"/>
                                <path fillRule="evenodd" clipRule="evenodd" d="M15.55 5.5C15.7816 4.35888 16.7905 3.5 18 3.5C19.3807 3.5 20.5 4.61929 20.5 6C20.5 7.38071 19.3807 8.5 18 8.5C16.7905 8.5 15.7816 7.64112 15.55 6.5H12.5V18C12.5 18.2761 12.2761 18.5 12 18.5H8.44999C8.21836 19.6411 7.20948 20.5 6 20.5C4.61929 20.5 3.5 19.3807 3.5 18C3.5 16.6193 4.61929 15.5 6 15.5C7.20948 15.5 8.21836 16.3589 8.44999 17.5H11.5V6C11.5 5.72386 11.7239 5.5 12 5.5H15.55ZM18 4.5C17.1716 4.5 16.5 5.17157 16.5 6C16.5 6.82843 17.1716 7.5 18 7.5C18.8284 7.5 19.5 6.82843 19.5 6C19.5 5.17157 18.8284 4.5 18 4.5ZM6 16.5C5.17157 16.5 4.5 17.1716 4.5 18C4.5 18.8284 5.17157 19.5 6 19.5C6.82843 19.5 7.5 18.8284 7.5 18C7.5 17.1716 6.82843 16.5 6 16.5Z" fill="teal-200"/>
                            </svg>
                            <span className="font-semibold text-xl tracking-tight">Dashboard</span>
                        </div>
                        <div className="text-white text-sm mb-2">
                            {props.selectedSong ? `Selected: ${props.selectedSong}` : "Click a song to select"}
                        </div>
                        <div className="border border-white-200 rounded-lg px-3 py-2  cursor-pointer hover:bg-gray-700 hover:text-gray-200 w-full text-center" onClick={handleOnClick}>
                            {loading ? "Loading..." : "Generate Recommendations"}
                        </div>
                        <div className="border border-white-200 rounded-lg px-3 py-2 w-full h-full text-center flex-1 text-white overflow-auto">
                            {!showRecs && <div>Click &apos;Generate Recommendations&apos; to get started!</div>}
                            {showRecs && error && (
                                <div className="text-red-400">{error}</div>
                            )}
                            {showRecs && !error && recommendations.length > 0 && (
                                <div>
                                    <div className="font-bold mb-2">Top 5 Recommendations:</div>
                                    {recommendations.map((rec, idx) => (
                                        <div key={idx}>{idx + 1}. {rec}</div>
                                    ))}
                                </div>
                            )}
                            {showRecs && loading && (
                                <div>Generating recommendations...</div>
                            )}
                        </div>
                </div>
                <div id="tooltip" className="row-span-1">
                    <span className="text-white">Hover one of the nodes!</span>
                </div>
            </div>
            
    );
}