import { useEffect, useState } from 'react'
import Box from './components/ui/Box';
import ResumeHandler from './components/ResumeHandler';
import PredictionResult from './components/PredictionResult';
import ChatModal from "./components/ChatModal";

function App() {
  const [prediction, setPrediction] = useState(null); // For storing the prediction result
  const [step, setStep] = useState(1); // Step 1: Choose type, Step 2: Upload or Write

  const [isChatModalOpen, setIsChatModalOpen] = useState(false);

  const openChat = () => setIsChatModalOpen(true);
  const closeChat = () => setIsChatModalOpen(false);

  useEffect(() => {
    console.log(`Current Step: ${step}`);
    if (prediction) {
      console.log('Prediction Result:', prediction);
    }
  }, [prediction, step]);
  

  const StepHandler = () => {
    switch (step) {
      case 1:
        return <ResumeHandler setStep={setStep} setPrediction={setPrediction} />;
      case 2:
        return <PredictionResult setStep={setStep} prediction={prediction} />
      default:
        return <ResumeHandler setStep={setStep} setPrediction={setPrediction} />;
    }
  }

  return (
    <>
      <div className='flow-root relative h-dvh w-dvw overflow-x-hidden pb-16'>
        <h1 className='text-4xl w-full text-center my-16'>Welcome To Job Master!</h1>
        <StepHandler />
        <button className='fixed bottom-4 right-6 bg-blue-500 text-white p-2 rounded-lg cursor-pointer shadow-lg hover:bg-blue-600 transition-colors'
                onClick={openChat}>
          Chat with AI

        </button>
        <ChatModal isOpen={isChatModalOpen} onClose={closeChat} />
      </div>
    </>
  )
}

export default App;
