import axios from "axios";
import { useState } from "react";
import Box from "./ui/Box";

const ResumeHandler = ({ setStep, setPrediction }) => {
    const [resumeType, setResumeType] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const [resumeText, setResumeText] = useState(""); // For storing the resume text if writing
    const [resumeFile, setResumeFile] = useState(null); // For storing the uploaded file

    const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

    const uploadHandler = async () => {
        if (resumeType === "upload") {
            const formData = new FormData();
            formData.append('file', resumeFile);
            setIsLoading(true);
            try {
                const response = await axios.post(`${API_URL}/predict`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });
                setPrediction(response.data);
                setStep(2); // Move to the next step after processing
            } catch (error) {
                console.error("Error uploading resume:", error);
            } finally {
                setIsLoading(false);
            }
        } else if (resumeType === "write") {
            setIsLoading(true);
            try {
                const response = await axios.post(`${API_URL}/predict`, {
                    text: resumeText
                });
                setPrediction(response.data);
                setStep(2); // Move to the next step after processing
            } catch (error) {
                console.error("Error uploading resume:", error);
            } finally {
                setIsLoading(false);
            }
        }
    }

    return (
        <Box>
            {resumeType === null ? (
                <>
                    <h2 className='text-center w-full text-xl'>📑 Choose your resume type</h2>
            <div className='flex justify-between items-center gap-2 mt-4 w-full'>
                <button
                    onClick={() => setResumeType('upload')}
                    className='w-full cursor-pointer bg-gray-600 rounded-sm p-4 border-2 border-gray-400 hover:border-purple-500 hover:text-pink-200 hover:scale-[98%] transition-all duration-300'>
                    Upload PDF 📤
                </button>
                <button
                    onClick={() => setResumeType('write')}
                    className='w-full cursor-pointer bg-gray-600 rounded-sm p-4 border-2 border-gray-400 hover:border-purple-500 hover:text-pink-200 hover:scale-[98%] transition-all duration-300'>
                    Write resume ✍
                </button>
            </div>
                </>
            ) : (
                <>
                    <h2 className='text-center w-full text-xl'>📝 {resumeType === 'upload' ? 'Upload your resume' : 'Write your resume'}</h2>
                    <div className='mt-4'>
                        {resumeType === 'upload' ? (
                            <input type="file" accept=".pdf" className='w-full p-2 border border-gray-300 rounded' onChange={(e) => {
                                setResumeFile(e.target.files[0]);
                                setResumeText(""); // Clear text if file is uploaded
                            }} />
                        ) : (
                            <textarea
                            className='w-full p-2 border border-gray-300 rounded h-40' 
                            placeholder='Write your resume here...'
                            onChange={(e) => {
                                setResumeText(e.target.value);
                                setResumeFile(null); // Clear file if text is written
                            }}
                        ></textarea>
                        )}
                    </div>
                    <button
                        disabled={isLoading}
                        onClick={() => uploadHandler()}
                        className='mt-4 cursor-pointer w-full bg-purple-600 text-white p-2 rounded hover:bg-purple-700 transition-all duration-300'>
                        {isLoading ? "Processing... ⏳" : "✉ Upload/Send Resume"}
                    </button>
                    <button
                        disabled={isLoading}
                        onClick={() => setResumeType(null)}
                        className='mt-4 cursor-pointer w-full bg-purple-600 text-white p-2 rounded hover:bg-purple-700 transition-all duration-300'>
                        🔙 Back
                    </button>
                </>
            )}
        </Box>
    )
}

export default ResumeHandler