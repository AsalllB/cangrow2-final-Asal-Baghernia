import axios from "axios";
import Box from "./ui/Box";
import { useState } from "react";


const PredictionResult = ({ prediction, setStep }) => {
    const [analysisReport, setAnalysisReport] = useState(null);
    const [jobDescription, setJobDescription] = useState(null);
    const [reportLoading, setReportLoading] = useState(false);
    const [descriptionLoading, setDescriptionLoading] = useState(false);

    const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

    const generateReport = async () => {
        if (!prediction) return;

        setReportLoading(true);
        try {
            let jobTitles = prediction["job_title_proba"].map(item => item.job_title).join(',');
            const reportResponse = await axios.get(`${API_URL}/job/analysis?predicts=${encodeURIComponent(jobTitles)}`);
            setAnalysisReport(reportResponse.data);

        } catch (error) {
            console.error("Error generating analysis report:", error);
        } finally {
            setReportLoading(false);
        }
    }

    const getJobDescription = async (jobTitle) => {
        if (!jobTitle) return;
        setDescriptionLoading(true);

        try {
            const descriptionResponse = await axios.post(`${API_URL}/job/description`, {
                job_title: jobTitle
            });

            setJobDescription(descriptionResponse.data);

        } catch (error) {
            console.error("Error getting job description:", error);
        } finally {
            setDescriptionLoading(false);
        }
    }

    const getBase64ImagesInOrder = (data) => {
        if (!data || !data.charts || typeof data.charts !== 'object') {
            console.error("Invalid data structure or missing 'charts' object.");
            return [];
        }

        const chartsObject = data.charts;

        const base64Array = Object.values(chartsObject).map(chartDetails => {
            if (chartDetails && typeof chartDetails === 'object' && chartDetails.hasOwnProperty('image_base64')) {
                return chartDetails.image_base64; // This could be a string or null (as per backend logic)
            }
            return null; // Return null if the structure is unexpected or image_base64 is missing
        });

        return base64Array;
    }

    return (
        <Box>
            <h2 className='text-center w-full text-xl'>📊 Prediction Result</h2>
            {prediction && typeof prediction === 'object' && (
                prediction["job_title_proba"].map((item, index) => (
                    <div key={index} className='mt-2 shadow-lg group w-full hover:bg-pink-400 hover:scale-105 transition-all duration-300 bg-gray-700 p-4 rounded-lg flex justify-between items-center'>
                        <div className="w-full flex flex-col">
                            <p className='text-lg font-semibold'>{item.job_title}</p>
                            <p className='text-sm text-gray-400 group-hover:text-white'>Probability: {item.probability.toFixed(2)}</p>
                        </div>
                        <p className='text-lg min-w-36 text-right'>{item.percentage} Match</p>
                    </div>
                ))
            )}
            {analysisReport && (
                <div className='mt-4 shadow-lg bg-gray-900 p-4 rounded-lg'>
                    <h3 className='text-lg font-semibold text-center'>📈 Analysis Report</h3>
                    <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="flex justify-between items-center border border-white rounded-lg p-2">
                            <p className='text-base text-gray-100 flex justify-between items-center'>
                                Average Salary:
                            </p>
                            <span className="text-green-400 font-semibold">
                                ${analysisReport["summary"]["Avg_Salary_Min"]}
                            </span>
                        </div>
                        <div className="flex justify-between items-center border border-white rounded-lg p-2">
                            <p className='text-base text-gray-100 flex justify-between items-center'>
                                Company Size Range:
                            </p>
                            <span className="text-green-400 font-semibold">
                                {analysisReport["summary"]["Company_Size_Range"]} people
                            </span>
                        </div>
                        <div className="flex justify-between items-center border border-white rounded-lg p-2">
                            <p className='text-base text-gray-100 flex justify-between items-center'>
                                Diverse Countries:
                            </p>
                            <span className="text-green-400 font-semibold">
                                {analysisReport["summary"]["Diverse_Countries"]} Countries
                            </span>
                        </div>
                        <div className="flex justify-between items-center border border-white rounded-lg p-2">
                            <p className='text-base text-gray-100 flex justify-between items-center'>
                                Median Of Experience:
                            </p>
                            <span className="text-green-400 font-semibold">
                                {analysisReport["summary"]["Median_Experience"]} Years
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-3 border border-white rounded-lg p-2 mt-3">
                        <h3>Work Types:</h3>
                        <div>
                            {analysisReport["summary"]["Flexible_Work_Types"].map((type, index) => (
                                <span key={index} className='inline-block bg-gray-700 hover:bg-purple-400 hover:scale-110 transition-all duration-300 text-white px-3 py-1 rounded-full text-sm mr-2 mb-2'>
                                    {type}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-col gap-3 border border-white rounded-lg p-2 mt-3">
                        <h3>Job Description For:</h3>
                        <div>
                            {prediction["job_title_proba"].map((type, index) => (
                                <button
                                    key={index}
                                    className='cursor-pointer inline-block bg-gray-700 hover:bg-purple-400 hover:scale-110 transition-all duration-300 text-white px-3 py-1 rounded-full text-sm mr-2 mb-2'
                                    onClick={() => getJobDescription(type.job_title)}
                                >
                                    {type.job_title}
                                </button>
                            ))}
                            {jobDescription && !descriptionLoading && (
                                <button
                                    className='cursor-pointer inline-block bg-red-700 hover:scale-95 transition-all duration-300 text-white px-3 py-1 rounded-full text-sm mr-2 mb-2'
                                    onClick={() => setJobDescription(null)}
                                >
                                    Clear Description
                                </button>
                            )}
                        </div>
                        {descriptionLoading && <p className='text-gray-400'>Loading description...</p>}
                        {jobDescription && !descriptionLoading && (
                            <div className='mt-2 p-2 bg-gray-800 rounded-lg'>
                                <h4 className='text-lg font-semibold'>Description For {jobDescription.job_title}:</h4>
                                <p className='text-gray-300 mt-2'>{jobDescription.data.description}</p>
                                {jobDescription.data.skills && jobDescription.data.skills.length > 0 && (
                                    <div className='mt-2'>
                                        <h5 className='text-md font-semibold'>Skills Required:</h5>
                                        <ul className='list-disc list-inside text-gray-300'>
                                            {jobDescription.data.skills.map((skill, index) => (
                                                <li key={index}>{skill}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-1 gap-3 mt-4">
                        {getBase64ImagesInOrder(analysisReport).map((image, index) => (
                            <div key={index} className='flex justify-between items-center border border-white rounded-lg p-2'>
                                <img src={`data:image/png;base64,${image}`} className="rounded-sm select-none w-full h-full" alt="Chart Title" draggable="false" />
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div className="w-full flex gap-3">
                <button
                    onClick={() => setStep(1)}
                    className='mt-4 shadow-lg bg-violet-600 text-white px-4 py-2 rounded hover:scale-95 transition-all duration-300 cursor-pointer'>
                    🔙 Back
                </button>
                {!analysisReport && (
                    <button
                        type="button"
                        disabled={reportLoading}
                        onClick={() => generateReport()}
                        className='mt-4 shadow-lg bg-violet-600 text-white px-4 py-2 rounded hover:scale-95 transition-all duration-300 cursor-pointer'>
                        {!reportLoading ? "📝 Generate Analysis Report" : "Generating... 🔬"}
                    </button>
                )}
                {/* {analysisReport && (
                    <button
                        onClick={() => setStep(3)}
                        className='mt-4 shadow-lg bg-green-600 text-white px-4 py-2 rounded hover:scale-95 transition-all duration-300 cursor-pointer'>
                        🌏 Generate Roadmap
                    </button>
                )} */}
            </div>
        </Box>
    )
}

export default PredictionResult;