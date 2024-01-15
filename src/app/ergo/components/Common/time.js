function Time(){
    return (
        <div className="flex space-x-4 m-4">
            <div className="flex flex-col w-60 items-center bg-white p-4 rounded-lg shadow-md ">
                <p className='text-xs font-bold text-black text-center'>No Time</p>
            </div>

            <div className="flex flex-col w-60 items-center bg-white p-4 rounded-lg shadow-md ">
                <p className='text-xs font-bold text-black text-center'>~5 mins</p>
            </div>

            <div className="flex flex-col w-60 items-center bg-white p-4 rounded-lg shadow-md ">
                <p className='text-xs font-bold text-black text-center'>Anytime in 24 hours</p>
            </div>

            <div className="flex flex-col w-60 items-center bg-white p-4 rounded-lg shadow-md ">
                <p className='text-xs font-bold text-black text-center'>3 mins</p>
            </div>
        </div>
    )
}
export default Time;