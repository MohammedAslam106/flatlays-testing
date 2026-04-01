import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import type { FlatlayBatchResult, FlatlayGarment, FlatlayResultItem } from "../types/flatlays";
import { MoveLeftIcon, MoveRightIcon } from "lucide-react";

export default function FlatLaysImageUpload() {

    const token = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2OGVlYTc3ZGE3NDA3OTQ5MTAyMWNjNWUiLCJlbWFpbCI6ImFzbGFtZGFkYTQxMDZAZ21haWwuY29tIiwicm9sZSI6InVzZXIiLCJpc09uYm9hcmRlZCI6dHJ1ZSwiaWF0IjoxNzczMjIwMjA3LCJleHAiOjE3NzM4MjUwMDcsImF1ZCI6ImJlc3Bva2UtdXNlcnMiLCJpc3MiOiJiZXNwb2tlLWFpLXN0eWxpc3QifQ.WPMk8_9Cek-xQpbA2R0dVfvAjfTHiq_tTTHCbPZoaMY"

    const BE_URL = "http://staging-infra-v2-alb-1219932791.ap-south-1.elb.amazonaws.com";

    const [dataToSend, setDataToSend] = useState<{
        images: string[],
        gender: "man" | "woman"
    }>({
        images: [
            "https://bespoke-media.s3.ap-south-1.amazonaws.com/af412e9e-cd52-4c94-8767-8310fbbf7e45-images (2).jpeg"],
        gender: "man"
    });

    const [batchId, setBatchId] = useState<string | null>(null)

    const [batchProgress, setBatchProgress] = useState<{
        "success": boolean,
        "batchId": string,
        "progress": number,
        "totalJobs": number
    } | null>(null)

    const [batchResults, setBatchResults] = useState<FlatlayResultItem[]>([])

    const [currentGarmentIdx, setCurrentGarmentIdx] = useState(0);

    const garments = useMemo(() => {
        const allGarments: FlatlayGarment[] = [];
        const savedGarmentImages = JSON.parse(localStorage.getItem('savedGarmentImages') || '[]') as string[];
        batchResults.forEach((resultItem) => {
            resultItem.garments.forEach((garment) => {
                allGarments.push(garment);
            });
        });

        // Filter out garments that have been saved
        const filteredGarments = allGarments.filter((garment) => !savedGarmentImages.includes(garment.image_url));

        return filteredGarments;
    }, [batchResults])

    const saveItem = async (itemIndex: number) => {
        // TODO: DB Operation to save garment
        const garmentToSave = garments[itemIndex];

        console.log("Saving garment:", garmentToSave);

        const newGarment = {
            "name": garmentToSave.metadata.name,
            "category": garmentToSave.metadata.category,
            "subcategory": garmentToSave.metadata.subcategory,
            "season": garmentToSave.metadata.seasons || [],
            "colors": garmentToSave.metadata.colors?.map(c => ({ name: c.name, hexCode: c.hex })) || [],
            "pattern": garmentToSave.metadata.pattern,
            "material": garmentToSave.metadata.fabric,
            "occasion": garmentToSave.metadata.occasions || [],
            "tags": garmentToSave.metadata.tags || [],
            "images": [
                garmentToSave.image_url
            ],
            "primaryColorHex": garmentToSave.metadata.primaryColorHex || undefined,
            "primaryColor": garmentToSave.metadata.primaryColor || undefined
        }

        const result = await fetch(`${BE_URL}/api/v2/flatlays/save-item`, {
            method: "POST",
            body: JSON.stringify(newGarment),
            headers: {
                "Content-Type": "application/json",
                Authorization: token,
            }
        });

        if (!result.ok) {
            const error = await result.json()
            alert(error.message || "Failed to save garment")
            return;
        }

        console.log("Garment saved:", await result.json());

        alert("Garment saved successfully!");

        // Store the garment image that is saved
        // NOTE: storing the image because it is unique identifier for garment here
        localStorage.setItem('savedGarmentImages', JSON.stringify([
            ...(JSON.parse(localStorage.getItem('savedGarmentImages') || '[]') as string[]),
            garmentToSave.image_url
        ]));

        // After saving, remove from list
        setBatchResults((prev) => {
            const newResults = [...prev];
            newResults.splice(itemIndex, 1);
            if (newResults.length === 0) {
                setBatchId(null);
                setBatchProgress(null);
                setBatchResults([]);
                localStorage.removeItem("batchId");
                localStorage.removeItem("savedGarmentImages");
            }
            return newResults;
        })
    }

    const skipItem = async (itemIndex: number) => {
        console.log("Skipping item at index:", itemIndex);
        setBatchResults((prev) => {
            const newResults = [...prev];
            newResults.splice(itemIndex, 1);
            if (newResults.length === 0) {
                setBatchId(null);
                setBatchProgress(null);
                setBatchResults([]);
                localStorage.removeItem("batchId");
                localStorage.removeItem("savedGarmentImages");
            }
            return newResults;
        })
    }

    const goToPrevious = () => {
        setCurrentGarmentIdx((prev) => (prev === 0 ? garments.length - 1 : prev - 1));
    };

    const goToNext = () => {
        setCurrentGarmentIdx((prev) => (prev === garments.length - 1 ? 0 : prev + 1));
    };

    async function getBatchResults(batchId: string) {
        const result = await fetch(`${BE_URL}/api/v2/flatlays/batch-results/${batchId}`, {
            headers: {
                Authorization: token,
            }
        });

        if (!result.ok) {
            const error = await result.json()
            alert(error.message || "Failed to fetch batch results")
            return;
        }

        const jsonRes = await result.json() as FlatlayBatchResult;

        setBatchResults(jsonRes.results || []);
    }

    async function onSubmit() {
        // alert("Hello THere");


        const res = await fetch(`${BE_URL}/api/v2/flatlays`, {
            method: "POST",
            body: JSON.stringify(dataToSend),
            headers: {
                "Content-Type": "application/json",
                Authorization: token,
            }
        });

        if (!res.ok) {
            const error = await res.json()
            alert(error.message || "Upload failed")
            return;
        }
        const jsonRes = await res.json();
        // alert("Upload successful: " + JSON.stringify(jsonRes));

        // alert("Json Res: " + JSON.stringify(jsonRes));

        localStorage.setItem("batchId", jsonRes.batchId);

        // const socket = io({host:"localhost",port:3000,secure:false});
        setBatchId(jsonRes.batchId);

    }

    useEffect(() => {
        if (!batchId) return;

        console.log("Setting up socket for batchId:", batchId);

        const socket = io(BE_URL);
        socket.emit("subscribe-flatlays", batchId);

        // Listen to progress
        socket.on("progress-flatlays", (data: {
            "success": boolean,
            "batchId": string,
            "progress": number,
            "totalJobs": number
        }) => {
            if (data.progress === 100) {
                getBatchResults(batchId);
                // localStorage.removeItem("batchId");
                // setBatchId(null);
                setBatchProgress(null);
                return;
            }
            console.log("Received progress via socket:", data);
            setBatchProgress(data);
        })

        // Cleanup on unmount
        return () => {
            socket.emit("unsubscribe-flatlays", batchId);
            socket.disconnect();
        };
    }, [batchId])

    useEffect(() => {
        const savedBatchId = localStorage.getItem("batchId");
        console.log(savedBatchId);
        if (savedBatchId) {

            // Fetch latest progress from REST endpoint
            fetch(`${BE_URL}/api/v2/flatlays/batch-progress/${savedBatchId}`, {
                headers: {
                    Authorization: token,
                }
            })
                .then((res) => res.json())
                .then((data) => {
                    if (data.success) {
                        if (data.progress === 100) {
                            // localStorage.removeItem("batchId");
                            // setBatchId(null);
                            getBatchResults(savedBatchId);
                            return;
                        }
                        setBatchId(savedBatchId);
                        setBatchProgress(data);
                        // setStatusMessage(data.message ?? "");
                    }
                });
        }
    }, [])

    return (
        <>
            <div className=" w-full flex flex-col items-center justify-center min-h-screen bg-gray-100">
                {
                    dataToSend.images.length > 0 ? (
                        <div className=" w-full flex flex-wrap gap-2 mb-4 max-w-2xl p-4 bg-white shadow-md rounded">
                            {dataToSend.images.map((imageUrl, idx) => (
                                <img key={idx} src={imageUrl} alt={`preview-${idx}`} className=" w-32 h-32 object-contain border border-gray-300" />
                            ))}
                        </div>
                    ) : null
                }

                {/* Progress bar */}
                {batchId && batchProgress &&
                    <div className="w-full max-w-2xl mb-4">
                        <SmoothProgressBar progress={batchProgress?.progress} />
                    </div>
                }

                <div
                    className=" w-full max-w-2xl p-4 bg-white shadow-md rounded"
                >
                    <div className=" w-full">
                        <p>
                            Enter image URLs (comma separated):
                        </p>
                        <textarea
                            onChange={(e) => setDataToSend((prev) => ({ ...prev, images: [...e.target.value.split(',').map(url => url.trim())] }))}
                            value={dataToSend.images.join(', ')}
                            className=" w-full border border-gray-300 px-2 py-2.5 rounded-md shadow-sm"
                            placeholder="https://asd...,https://adf..."
                        >
                        </textarea>
                    </div>

                    <div className=" w-full">
                        <p>
                            Gender
                        </p>
                        <select
                            className=" w-full border border-gray-300 px-2 py-2.5 rounded-md shadow-sm mb-4"
                            defaultValue={"man"}
                            onSelect={(e) => setDataToSend(prev => ({ ...prev, gender: e.currentTarget.value as 'man' | 'woman' }))}
                        >
                            <option value="men">Men</option>
                            <option value="women">Women</option>
                        </select>
                    </div>
                    <button
                        disabled={dataToSend.images.length == 0}
                        className=" mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition w-full hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
                        onClick={() => onSubmit()}
                    >
                        Upload
                    </button>
                </div>
            </div>

            {
                (garments.length > 0) && (
                    <div className=" w-1/2 flex flex-col items-center justify-center min-h-10/12 bg-white shadow-lg rounded-xl p-4 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <h2 className=" text-2xl font-semibold mb-4">Batch Results</h2>
                        <div className=" w-full flex items-center justify-center gap-4">
                            <button
                                onClick={goToPrevious}
                                className=" p-2 hover:bg-gray-200 rounded-lg transition"
                            >
                                <MoveLeftIcon size={24} />
                            </button>

                            {garments.length > 0 && (
                                <div className=" flex-1 flex flex-col items-center">
                                    <div key={currentGarmentIdx} className=" w-full mb-6 p-4 border border-gray-300 rounded ">
                                        <img src={garments[currentGarmentIdx].image_url} alt={`garment-${currentGarmentIdx}`} className=" w-48 h-48 object-contain mb-2 border border-gray-300 mx-auto" />

                                        <div className=" grid grid-cols-2 gap-2 w-full">
                                            {Object.entries(garments[currentGarmentIdx].metadata).map(([key, value]) => {
                                                const displayValue = Array.isArray(value) ? value.join(", ") : String(value) as string;
                                                return (
                                                    <div key={key} className=" mb-1">
                                                        <span className=" font-semibold">{key}:</span>{" "}{displayValue}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                    <div className=" text-sm text-gray-600 mt-2">
                                        {currentGarmentIdx + 1} / {garments.length}
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={goToNext}
                                className=" p-2 hover:bg-gray-200 rounded-lg transition"
                            >
                                <MoveRightIcon size={24} />
                            </button>
                        </div>

                        <div className=" flex w-full justify-center items-center gap-5 mt-5">
                            <button
                                onClick={() => skipItem(currentGarmentIdx)}
                                className=" px-4 py-2 bg-gray-300 text-black rounded hover:bg-gray-400 transition w-full hover:shadow-lg cursor-pointer">
                                Skip
                            </button>
                            <button
                                onClick={() => saveItem(currentGarmentIdx)}
                                className=" px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition w-full hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer">
                                Save
                            </button>
                        </div>
                    </div>
                )
            }
        </>
    );
}


interface SmoothProgressBarProps {
    progress: number; // target progress (from backend/socket)
}

function SmoothProgressBar({ progress }: SmoothProgressBarProps) {

    return (
        <div className="w-full">
            <div className="w-full h-4 bg-gray-300 rounded overflow-hidden">
                <div
                    className="h-4 bg-blue-600 transition-all duration-100 ease-linear"
                    style={{ width: `${progress===undefined ? 0 : Math.min(100, Math.max(0, progress))}%` }}
                />
            </div>
            <p className="text-sm text-gray-700 mt-1">
                {progress===undefined ? "Waiting..." : `${Math.round(progress)}%`}
            </p>
        </div>
    );
}
