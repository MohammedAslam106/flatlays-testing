import { useEffect, useRef, useState, type FormEvent } from "react";
import { PlusCircle } from "lucide-react";
import { io } from "socket.io-client";


// 🔹 Example User Scenario

// User uploads images → job starts → WebSocket shows 20% → 50%.

// User refreshes the page.

// On reload:

// WebSocket connection starts again, but hasn’t received any new events yet.

// Frontend immediately calls /job-status/:jobId → gets { progress: 50, stage: 'processing' }.

// UI jumps to 50% instantly, correctly showing job state.

// Then, as worker continues, new WebSocket messages update the UI further.

export default function UploadImageForm() {
    const inpFileRef = useRef<HTMLInputElement | null>(null);

    const [files, setFiles] = useState<FileList | null>(null);

    const [jobId, setJobId] = useState<string | null>(null)

    const [jobProgress, setJobProgress] = useState<{
        stage: string, currentStep: number, totalSteps: number,
        progress: number, message: string, finalResult?: Array<{ processedImage?: string; fileName?: string; error?: string; dbInserted?: boolean; }>
    } | null>(null)

    async function onSubmit(e: FormEvent<HTMLFormElement>) {
        // alert("Hello THere");
        e.preventDefault();
        const form = e.currentTarget;

        // Log form data entries for debugging
        const formData = new FormData(form);
        formData.append('gender', 'male');

        for (const [key, value] of formData.entries()) {
            console.log(key, value);
        }

        const res = await fetch("http://localhost:3000/api/v2/closet/items", {
            method: "POST",
            body: formData,
            headers: {
                Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2OGVlYTc3ZGE3NDA3OTQ5MTAyMWNjNWUiLCJlbWFpbCI6ImFzbGFtZGFkYTQxMDZAZ21haWwuY29tIiwicm9sZSI6InVzZXIiLCJpc09uYm9hcmRlZCI6dHJ1ZSwiaWF0IjoxNzY5NzkyMTU4LCJleHAiOjE3NzAzOTY5NTgsImF1ZCI6ImJlc3Bva2UtdXNlcnMiLCJpc3MiOiJiZXNwb2tlLWFpLXN0eWxpc3QifQ.OBwmnTv8iSKGBWNVhoeko4kPI0tLp2R7l5KciPJVTOQ",
            }
        });

        if (!res.ok) {
            const error =await res.json()
            alert(error.message || "Upload failed")
            return;
        }
        const jsonRes = await res.json();
        // alert("Upload successful: " + JSON.stringify(jsonRes));

        localStorage.setItem("jobId", jsonRes.jobId);

        // const socket = io({host:"localhost",port:3000,secure:false});
        setJobId(jsonRes.jobId);

    }

    useEffect(() => {
        if (!jobId) return;
        const socket = io("ws://localhost:3000");
        socket.emit("subscribe", jobId);

        // Listen to progress
        socket.on("progress", (data: { stage: string, currentStep: number, totalSteps: number, progress: number, message: string, finalResult?: Array<{ processedImage?: string; fileName?: string; error?: string; dbInserted?: boolean; }> }) => {
            if (data.stage === "completed") {
                console.log(JSON.stringify(data))
                const incompleteImages = data.finalResult?.filter((img) => {
                    if (img.error) {
                        return true;
                    }
                })

                if (incompleteImages !== undefined && incompleteImages.length > 0) {
                    alert(`Error processing ${incompleteImages?.length} images:\n` + incompleteImages?.map(img => `${img.fileName}: ${img.error}`).join("\n"))
                }

                localStorage.removeItem("jobId");
                setJobId(null);
                socket.disconnect();
            }
            if (data.stage === "skipped") {
                alert(data.message)
            }
            if (data.stage === 'failed') {
                alert(data.message)
            }
            setJobProgress(data);
        })

        // Cleanup on unmount
        return () => {
            socket.emit("unsubscribe", jobId);
            socket.disconnect();
        };
    }, [jobId])

    useEffect(() => {
        const savedJobId = localStorage.getItem("jobId");
        if (savedJobId) {
            setJobId(savedJobId);

            // Fetch latest progress from REST endpoint
            fetch(`http://localhost:3000/api/v2/closet/items/job-status/${savedJobId}`, {
                headers: {
                    Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2OGRkMzk4MjQ4ZjhkNTg3YzIyNzc1MjAiLCJlbWFpbCI6InRlc3QyQHRlc3QyLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU5NDk0OTQ1LCJleHAiOjE3NTk1ODEzNDV9.tnb6GQMcBM0wvKgvhpaI7oStIREISFm7GJgmYFvmywQ",
                }
            })
                .then((res) => res.json())
                .then((data) => {
                    if (data.success) {
                        if (data.progress === 100) {
                            localStorage.removeItem("jobId");
                            setJobId(null);
                        }
                        setJobProgress(data);
                        // setStatusMessage(data.message ?? "");
                    }
                });
        }
    }, [])

    return (
        <div className=" w-full flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <div className=" w-full flex flex-wrap gap-2 mb-4 max-w-2xl p-4 bg-white shadow-md rounded">
                {files ? (
                    Array.from(files).map((file, idx) => (
                        <ImagePreviewer key={idx} file={file} />
                    ))
                ) : (
                    <div className=" text-gray-400 w-full text-center">
                        No images uploaded yet.
                    </div>
                )}
            </div>
            {/* Progress bar */}
            {jobId && jobProgress && 
                <div className="w-full max-w-2xl mb-4">
                    <SmoothProgressBar progress={jobProgress?.progress} message={jobProgress?.message} />
                </div>
            }

            <form
                onSubmit={onSubmit}
                className=" w-full max-w-2xl p-4 bg-white shadow-md rounded"
            >
                <div
                    onClick={() => {
                        inpFileRef.current?.click();
                    }}
                    className=" w-full border border-gray-300 border-dashed rounded h-32 flex items-center justify-center cursor-pointer hover:bg-gray-50 transition"
                >
                    <PlusCircle />
                </div>
                <input
                    onChange={(e) => {
                        if (e.target.files !== null) {
                            setFiles(e.target.files);
                        }
                    }}
                    ref={inpFileRef}
                    accept="image/*"
                    type="file"
                    name="images"
                    id="images"
                    multiple
                    hidden
                    className="file-input file-input-bordered file-input-primary w-full max-w-xs"
                />

                <button
                    disabled={files?.length == 0 || files == null}
                    className=" mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition w-full hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
                >
                    Upload
                </button>
            </form>
        </div>
    );
}

function ImagePreviewer({ file }: { file: File }) {
    const [preview, setPreview] = useState<string | null>(null);
    useEffect(() => {
        let objectUrl: string | undefined;
        if (file) {
            objectUrl = URL.createObjectURL(file);
            setPreview(objectUrl);
        }
        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [file]);

    return (
        <div className=" w-fit flex flex-wrap gap-2 max-w-lg">
            <img
                src={preview || ""}
                alt={`preview`}
                className=" w-32 h-32 object-contain border border-gray-300"
            />
        </div>
    );
}


interface SmoothProgressBarProps {
    progress: number; // target progress (from backend/socket)
    message?: string; // optional status message
}

function SmoothProgressBar({ progress, message }: SmoothProgressBarProps) {
    const [displayProgress, setDisplayProgress] = useState(0);

    useEffect(() => {
        if (progress === undefined) return;

        setDisplayProgress(progress);

        // const interval = setInterval(() => {
        //     setDisplayProgress(prev => {
        //         if (prev < progress) {
        //             return Math.min(prev + 2, progress); // step smoothly
        //         }
        //         return prev;
        //     });
        // }, 50); // adjust speed (ms)

        // return () => clearInterval(interval);
    }, [progress]);

    return (
        <div className="w-full">
            <div className="w-full h-4 bg-gray-300 rounded overflow-hidden">
                <div
                    className="h-4 bg-blue-600 transition-all duration-100 ease-linear"
                    style={{ width: `${displayProgress}%` }}
                />
            </div>
            <p className="text-sm text-gray-700 mt-1">
                {Math.round(displayProgress)}% {message ? ` - ${message}` : ""}
            </p>
        </div>
    );
}
