function Time(){
    return (
        <div className="flex space-x-4 m-4">
            <div className="flex flex-col w-60 items-center bg-white p-4 rounded-lg shadow-md ">
                <p className='text-xs font-bold text-black text-center'>Instant</p>
            </div>

            <div className="flex flex-col w-60 items-center bg-white p-4 rounded-lg shadow-md ">
                <p className='text-xs font-bold text-black text-center'>Around 5 mins</p>
            </div>

            <div className="flex flex-col w-60 items-center bg-white p-4 rounded-lg shadow-md ">
                <p className='text-xs font-bold text-black text-center'>Within 24 hours</p>
            </div>

            <div className="flex flex-col w-60 items-center bg-white p-4 rounded-lg shadow-md ">
                <p className='text-xs font-bold text-black text-center'>Less than 3 mins</p>
            </div>
        </div>
    )
}
export default Time;