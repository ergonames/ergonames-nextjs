function ReceiveErgo(){
    return (
        <div className="flex flex-col items-center justify-center">
            <figure className="w-48 h-48 px-5 pt-5 mx-auto">
                <img src="ergo-image.png" alt="Shoes" className="rounded-xl" />
            </figure>
            <p className="text-black text-xl">Congratulations!</p>
            <p className="text-black text-sm">You are now the owner of <b className="text-customOrange">ERGONAMES</b></p>
            <p className="text-black text-sm">Your name was successfullty registered. You can now view and manage your name.</p>
            <div className="flex justify-center my-2">
                <button className="btn bg-grey hover:bg-grey w-48 text-customOrange border-transparent hover:border-transparent" >Register Other</button>
                <button className="btn bg-customOrange hover:bg-customOrangeDark w-48 text-white border-transparent hover:border-transparent" >View Name</button>
            </div>
        </div>
    )
}
export default ReceiveErgo;
