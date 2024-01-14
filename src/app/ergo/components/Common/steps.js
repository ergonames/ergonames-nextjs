function Steps({ step }) {
    return (
      <div className="flex space-x-4 m-4">
        {[1, 2, 3, 4].map((stepNumber) => (
          <div key={stepNumber} className={`flex flex-col w-60 items-center bg-${step === stepNumber ? 'customOrange' : 'white'} p-4  border-lg border-${step >= stepNumber ? 'customOrange' : 'transparent'} rounded-lg shadow-md`}>
            <div className={`w-10 h-10 my-2 bg-${step >= stepNumber ? 'black' : 'customOrange'} text-white rounded-full flex items-center justify-center`}>
            {step > stepNumber ? (
              <img src="/check.ico" alt="Check Icon" className="w-6 h-6" />
            ) : (
              <p className="text-lg font-bold">{stepNumber}</p>
            )}
            </div>
            <p className="text-xs text-center text-black">{getStepContent(stepNumber)}</p>
          </div>
        ))}
      </div>
    );
  }
  
  const getStepContent = (stepNumber) => {
    switch (stepNumber) {
      case 1:
        return 'Enter the ErgoNames NFT minting queue';
      case 2:
        return 'Wait 3 blocks for the commit to complete';
      case 3:
        return 'Mint your ErgoName within 720 blocks (~1 day)';
      case 4:
        return 'Receive ErgoNames';
      default:
        return '';
    }
  };
  
  export default Steps;
  