"use client";
import React, { useState , useEffect} from 'react';
import Steps from '../Common/steps';
import CommitFee from './transaction/commitFee';
import Wait from './transaction/wait';
import RegisteringFee from './transaction/registeringFee';
import Complete from './transaction/complete';
import ReceiveErgo from './transaction/receiveErgo';


function MintingProcess({onBack}){
    const [step, setStep] = useState(1);
    const increaseStep = () => {setStep((prev)=>prev+1)}
    const decreaseStep = () => {setStep((prev)=>prev-1)}
    const getStepContent = (stepNumber) => {
        switch (stepNumber) {
            case 1:
                return 'Confirm Details';
            case 2:
                return 'Almost there';
            case 3:
                return 'Confirm Details';
            case 4:
                return 'Transaction Done';
            default:
                return '';
        }
    };

    return (
        <div>
            <div className="bg-white p-2 rounded-lg shadow-md ">
                <p className='text-black text-center text-lg font-bold'> Minting Process</p>
                <p className='text-black text-center text-sm'>Registering your name takes four steps</p>
                <Steps step={step}/>
            </div>
            <div className="bg-white p-2 rounded-lg shadow-md">
                <p className='text-black text-center text-lg font-bold'>{getStepContent(step)}</p>
                {step === 1 && <CommitFee />}
                {step === 2 && <Wait />}
                {step === 3 && <RegisteringFee />}
                {step === 4 && <Complete />}
                {step === 5 && <ReceiveErgo/>}
                <button className="btn btn-primary customOrange" onClick={decreaseStep}>Back</button>
                <button className="btn btn-primary customOrange" onClick={increaseStep}>Next</button>
            </div>
        </div>
    )

}

export default MintingProcess;
