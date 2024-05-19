import { toast, ToastContainer } from 'react-toastify';
import Steps from '../Common/steps';
import Fees from '../Common/fees';
import Time from '../Common/time';

const mintCost = null;
const transactionFee = null;
// const mintCost = localStorage.getItem('mintCost');
// const transactionFee = localStorage.getItem('transactionFee');
const totalMintingCost = parseInt(mintCost) + 7 * transactionFee;
// debugger;

function ProcessOverview({onComplete,onBack}){
const validateCurrentStep = async () =>{
let isWalletConnected = await ergoConnector.nautilus.connect();
return isWalletConnected;
}
const goToNextStep = async () =>{
let validate = await validateCurrentStep();
if(validate===true){
onComplete();
}
else{
toast.warn("Please connect with Wallet to proceed");
}
}
return (
<div>
    <div className="bg-white p-2 rounded-lg shadow-md">
        <p className='text-black text-center text-lg font-bold'> Before we Start </p>
        <p className='text-black text-center text-sm'> Registering your name takes four steps </p>
        <p className='text-black text-center text-lg font-bold '> Steps</p>
        <Steps/>
        <p className='text-black text-center text-lg font-bold '>Time</p>
        <Time/>
        <p className='text-black text-center text-lg font-bold '>Cost</p>
        <Fees/>
        <p className='text-black text-center text-xl font-extrabold'><b>Total Minting Cost: {totalMintingCost} ERG</b></p>
        <div className="flex flex-col justify-center">
            <div className="flex justify-center my-4">
                <button className="flex bg-customOrange text-white text-sm p-2 rounded-l-md focus:outline-none">
                    ERG
                </button>
                <button className="flex bg-grey text-black text-sm p-2 rounded-r-md focus:outline-none">
                    USD
                </button>
            </div>
            <div className="flex justify-center">
                <button className="btn bg-grey hover:bg-grey w-48 text-customOrange border-transparent hover:border-transparent" onClick={onBack}>Back</button>
                <button className="btn bg-customOrange hover:bg-customOrangeDark w-48 text-white border-transparent hover:border-transparent" onClick={goToNextStep}>Start Minting</button>
            </div>
        </div>

    </div>
    <ToastContainer position="bottom-left" autoClose={5000} hideProgressBar newestOnTop={false} closeOnClick rtl={false}
        pauseOnFocusLoss draggable pauseOnHover theme="light" />
</div>
)

}

export default ProcessOverview;
