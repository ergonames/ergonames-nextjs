function Fees({fees}){
    return (
        <div className="flex space-x-4 m-4">
            <div className="flex flex-col w-60 items-center bg-white p-4 rounded-lg shadow-md ">
                <p className='text-xs font-bold text-black text-center'>{localStorage.getItem('transactionFee') * 4} ERG</p>
            </div>

            <div className="flex flex-col w-60 items-center bg-white p-4 rounded-lg shadow-md ">
                <p className='text-xs font-bold text-black text-center'>No fees</p>
            </div>

            <div className="flex flex-col w-60 items-center bg-white p-4 rounded-lg shadow-md ">
                <p className='text-xs font-bold text-black text-center'>{localStorage.getItem('mintCost') * 1 + localStorage.getItem('transactionFee') * 3} ERG</p>
            </div>

            <div className="flex flex-col w-60 items-center bg-white p-4 rounded-lg shadow-md ">
                <p className='text-xs font-bold text-black text-center'>No Fees</p>
            </div>
        </div>
    )
}
export default Fees;