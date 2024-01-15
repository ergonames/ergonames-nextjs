"use client"
import React, { useState , useEffect} from 'react';
import BeginTransaction from './components/BeginTransaction/beginTransaction';
import ProcessOverview from './components/ProcessOverview/processOverview';
import MintingProcess from './components/MintingProcess/mintingProcess';

export default function ergo() {

    const [currentStep, setCurrentStep] = useState(0);
    const handleNextStep = () => {
      setCurrentStep((prevStep) => (prevStep < steps.length-1 ? prevStep + 1 : prevStep));
    };
    const handlePrevStep=()=>{
      setCurrentStep((prevStep)=> (prevStep > -1 ? prevStep - 1 : prevStep));
    }
    const steps = [
      <BeginTransaction onComplete={handleNextStep} />,
      <ProcessOverview onComplete={handleNextStep} onBack={handlePrevStep} />,
      <MintingProcess onBack={handlePrevStep} />
    ];
    useEffect(()=>{
      console.log("currentStep",currentStep);
    },[currentStep])

    return (
      <div>
        {steps[currentStep]}
      </div>
      )
  }