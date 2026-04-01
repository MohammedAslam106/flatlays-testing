import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, PlusCircle } from "lucide-react";
import { io } from "socket.io-client";


// 🔹 Example User Scenario

// User uploads images → job starts → WebSocket shows 20% → 50%.

// User refreshes the page.

// On reload:

// WebSocket connection starts again, but hasn’t received any new events yet.

// Frontend immediately calls /job-status/:jobId → gets { progress: 50, stage: 'processing' }.

// UI jumps to 50% instantly, correctly showing job state.

// Then, as worker continues, new WebSocket messages update the UI further.

interface AIResult {
    "source_index": number,
    "image_url": string,
    "metadata": {
        "name": string,
        "gender": string,
        "category": string,
        "subcategory": string,
        "seasons": string[],
        "primaryColor": string,
        "primaryColorHex": string,
        "colors": {name: string, hex: string}[],
        "fabric": string,
        "occasions": string[],
        "pattern": string,
        "tags": string[]
    },
    isSkipped: boolean,
    isSaved: boolean
}

interface TempFlatLaysJobResult {
    jobId: string;
    aiResult?: AIResult[];
    error?: string;
    message: string;
}

const API_URL = 'http://staging-infra-v2-alb-1219932791.ap-south-1.elb.amazonaws.com'

const BEARER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2OGVlYTc3ZGE3NDA3OTQ5MTAyMWNjNWUiLCJlbWFpbCI6ImFzbGFtZGFkYTQxMDZAZ21haWwuY29tIiwiZmlyc3ROYW1lIjoiTW9oYW1tZWQiLCJsYXN0TmFtZSI6IkFzbGFtIiwicm9sZSI6InVzZXIiLCJpc09uYm9hcmRlZCI6dHJ1ZSwiaWF0IjoxNzc0ODYyMDExLCJleHAiOjE3NzU0NjY4MTEsImF1ZCI6ImJlc3Bva2UtdXNlcnMiLCJpc3MiOiJiZXNwb2tlLWFpLXN0eWxpc3QifQ.vvnv88L4yyoc3eJKo3SWfsPxDRXXdhpzN0SNPbCwYWE'

export default function TempFlatLays() {


    const inpFileRef = useRef<HTMLInputElement | null>(null);

    const [files, setFiles] = useState<FileList | null>(null);

    const [jobId, setJobId] = useState<string | null>(null)

    const [jobResult, setJobResult] = useState<TempFlatLaysJobResult | null>(null);

    const [isUploading, setIsUploading] = useState(false);

    const [isSkipping, setIsSkipping] = useState(false);

    const [isAdding, setIsAdding] = useState(false);

    const contRef = useRef<HTMLDivElement | null>(null);

    // const [jobProgress, setJobProgress] = useState<{
    //     stage: string, currentStep: number, totalSteps: number,
    //     progress: number, message: string, finalResult?: Array<{ processedImage?: string; fileName?: string; error?: string; dbInserted?: boolean; }>
    // } | null>(null)

    async function onSubmit(e: FormEvent<HTMLFormElement>) {
        try {
            // alert("Hello THere");
            setIsUploading(true);
            e.preventDefault();
            const form = e.currentTarget;
    
            // Log form data entries for debugging
            const formData = new FormData(form);
            // formData.append('gender', 'male');
    
            // for (const [key, value] of formData.entries()) {
            //     console.log(key, value);
            // }
    
            const res = await fetch(`${API_URL}/api/v2/closet-v1/items/flat-lay`, {
                method: "POST",
                body: formData,
                headers: {
                    Authorization: `Bearer ${BEARER_TOKEN}`,
                }
            });
    
            if (!res.ok) {
                const error =await res.json()
                alert(error.message || "Upload failed")
                // setIsUploading(false);
                return;
            }
            const jsonRes = await res.json();
            // alert("Upload successful: " + JSON.stringify(jsonRes));
    
            localStorage.setItem("jobId", jsonRes.jobId);
    
            // const socket = io({host:"localhost",port:3000,secure:false});
            setJobId(jsonRes.jobId);
            // setIsUploading(false);
        } catch (error) {
            console.error("Error uploading file:", error);
            alert("An error occurred while uploading the file.");
        }finally {
            setIsUploading(false);
        }
    }

    useEffect(() => {
        if (!jobId) return;
        const socket = io(`${API_URL}`);

        socket.emit('subscribe-temp-flatlays', jobId);

        socket.on('temp-flatlays-result', (data) => {
            console.log("Received WebSocket message:", data);
            setJobResult(data);
            // You can update your UI based on the received data here
        });

        // Cleanup on unmount
        return () => {
            // socket.emit("unsubscribe", jobId);
            socket.disconnect();
        };
    }, [jobId])

    useEffect(() => {
        const savedJobId = localStorage.getItem("jobId");
        if (savedJobId) {
            setJobId(savedJobId);

            // Fetch latest progress from REST endpoint
            fetch(`${API_URL}/api/v2/closet-v1/items/flat-lay/result/${savedJobId}`, {
                headers: {
                    Authorization: `Bearer ${BEARER_TOKEN}`,
                }
            })
                .then((res) => res.json())
                .then((data) => {
                    console.log("Fetched job result on page reload:", data.data);
                    if (data.success && data.data.aiResult) {
                        // if (data.progress === 100) {
                        //     localStorage.removeItem("jobId");
                        //     setJobId(null);
                        // }
                        setJobResult(data.data);

                        const itemIndexWhoseStatusIsNotUpdated = data.data.aiResult?.findIndex((item: AIResult) => !item.isSaved && !item.isSkipped);

                        console.log("Index of first item whose status is not updated (not saved or skipped):", itemIndexWhoseStatusIsNotUpdated);

                        console.log("Total items in AI result:", data.data.aiResult?.length - 1);

                        if(itemIndexWhoseStatusIsNotUpdated === -1) {
                            localStorage.removeItem('jobId');
                            setJobId(null);
                            setJobResult(null);
                        }else {
                            contRef.current?.scrollTo({ left: itemIndexWhoseStatusIsNotUpdated * (contRef.current.clientWidth + 8), behavior: 'smooth' });
                        }
                        // setJobProgress(data);
                        // setStatusMessage(data.message ?? "");
                    }
                });
        }
    }, [])

    async function skipItem(sourceIndex: string, image: string) {
        try {
            setIsSkipping(true);
            console.log("Skipping item with sourceIndex:", sourceIndex, "and image:", image);
            const res = await fetch(`${API_URL}/api/v2/closet-v1/items/flat-lay/skip-item/${jobId}`, {
                method: "POST",
                body: JSON.stringify({ sourceIndex, image }),
                headers: {
                    "Content-Type": "application/json",

                    Authorization: `Bearer ${BEARER_TOKEN}`,
                }
            });
            if (!res.ok) {
                const error = await res.json();
                alert(error.message || "Failed to skip item");
                return;
            }

            location.reload();
            
        } catch (error) {
            console.error("Error skipping item:", error);
            alert("An error occurred while skipping the item.");
        } finally {
            setIsSkipping(false);
        }
    }

    async function addItem(data: AIResult) {
        try {
            setIsAdding(true);

            const dataToSave = {
                name: data.metadata.name,
                category: data.metadata.category,
                subcategory: data.metadata.subcategory,
                seasons: data.metadata.seasons,
                primaryColor: data.metadata.primaryColor,
                primaryColorHex: data.metadata.primaryColorHex,
                colors: data.metadata.colors.map(color => ({ name: color.name, hexCode: color.hex })),
                material: data.metadata.fabric,
                occasions: data.metadata.occasions,
                images: [data.image_url],
                pattern: data.metadata.pattern,
                tags: data.metadata.tags

                // TODO: Add more fields as necessary based on user updates the fields in the UI before saving
            }

            // console.log("Adding item with data:", dataToSave);

            const res = await fetch(`${API_URL}/api/v2/closet-v1/items/flat-lay/save-item/${jobId}`, {
                method: "POST",
                body: JSON.stringify(dataToSave),
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${BEARER_TOKEN}`,
                }
            });
            if (!res.ok) {
                const error = await res.json();
                alert(error.message || "Failed to add item");
                return;
            }

            location.reload();
        } catch (error) {
            console.error("Error adding item:", error);
            alert("An error occurred while adding the item.");
        } finally {
            setIsAdding(false);
        }
    }


    return (
        <>
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
                {jobId && !jobResult && 
                    <div className="w-full max-w-2xl mb-4">
                        <SmoothProgressBar />
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
                        disabled={files?.length == 0 || files == null || isUploading}
                        className=" mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition w-full hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {isUploading ? 'Uploading...' : 'Upload'}
                    </button>
                </form>
            </div>
            
            {
                (jobResult && jobResult.aiResult) &&

                <div className=" absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1/2 h-fit bg-opacity-50 flex flex-col items-center justify-center p-4 bg-gray-300 rounded shadow-lg">
                    <h2 className=" text-xl font-bold mb-4">AI Result {jobResult.aiResult.length}:</h2>

                    <div
                        ref={contRef}
                        className=" w-full flex justify-start items-center gap-2 overflow-hidden"
                    >
                        {jobResult.aiResult.map((item, idx) => (
                            <div className=" min-w-full" key={idx}>
                                <div className=" w-full mb-4 p-4 border rounded bg-white shadow flex flex-col items-start">
                                    <div className=" w-full flex justify-center items-center">
                                        <img src={item.image_url} alt={`result-${idx}`} className=" w-32 h-32 object-contain mb-2" />
                                    </div>
                                    <div><strong>Name:</strong> {item.metadata.name}</div>
                                    {/* <div><strong>Gender:</strong> {item.metadata.gender}</div> */}
                                    <div><strong>Category:</strong> {item.metadata.category}</div>
                                    <div><strong>Subcategory:</strong> {item.metadata.subcategory}</div>
                                    <div><strong>Seasons:</strong> {item.metadata.seasons.join(", ")}</div>

                                    <div>
                                        <strong>Colors:</strong>
                                        {item.metadata.colors.map((color, colorIdx) => (
                                            <span key={colorIdx} className=" inline-flex items-center mr-2">
                                                {color.name} <span style={{ backgroundColor: color.hex }} className=" inline-block w-4 h-4 rounded-full ml-1"></span>
                                            </span>
                                        ))}
                                    </div>

                                    <div><strong>Primary Color:</strong> {item.metadata.primaryColor} <span style={{ backgroundColor: item.metadata.primaryColorHex }} className=" inline-block w-4 h-4 rounded-full ml-1"></span></div>
                                    <div><strong>Fabric:</strong> {item.metadata.fabric}</div>
                                    <div><strong>Occasions:</strong> {item.metadata.occasions.join(", ")}</div>
                                    <div><strong>Pattern:</strong> {item.metadata.pattern}</div>
                                    <div><strong>Tags:</strong> {item.metadata.tags.join(", ")}</div>
                                </div>
                                
                                
                                <div className=" w-full flex justify-center items-center gap-5">
                                    <button
                                        onClick={()=>{
                                            skipItem(item.source_index.toString(), item.image_url)
                                        }}
                                        className=" bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 transition"
                                    >
                                        Skip
                                    </button>

                                    <button 
                                        onClick={() => {
                                            addItem(item)
                                        }}
                                        className=" bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
                                        Add
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className=" absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" >
                        {isSkipping && <span className=" text-gray-50 px-2 py-1.5 bg-gray-800 rounded shadow-md">Skipping item...</span>}
                        {isAdding && <span className=" text-gray-50 px-2 py-1.5 bg-gray-800 rounded shadow-md">Adding item...</span>}
                    </div>
                </div>
            }
        </>
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



function SmoothProgressBar() {

    return (
        <div className="w-full px-4 py-2 ">
            <div className=" flex justify-center items-center gap-4">
                <Loader2 className="animate-spin" />
                <span className=" text-gray-600">Processing...</span>
            </div>
        </div>
    );
}
