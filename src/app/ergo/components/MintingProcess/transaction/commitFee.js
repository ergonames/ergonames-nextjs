function CommitFee(){
const name = localStorage.getItem('searchInput');
return (
        <div className="flex flex-col items-center justify-center">
           <img src="Wallet.png" // Replace with the actual path to your image alt="Image 1"
                            className="w-8 h-8 object-cover mb-2" />
            <p className="text-black text-sm">Double check these detail before confirming in the wallet</p>
            <div className="card card-compact w-1/2 bg-white shadow-l border my-1">
                <div className="card-body">
                    <div className="flex items-center justify-between bg-white text-black">
                        <div className="flex-none">
                            <p>Name</p>
                        </div>
                        <div className="flex-none">
                            <p>{name}.eth</p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="card card-compact w-1/2 bg-white shadow-l border my-1">
                <div className="card-body">
                    <div className="flex items-center justify-between bg-white text-black">
                        <div className="flex-none">
                            <p>Action</p>
                        </div>
                        <div className="flex-none">
                            <p>Start Commit</p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="card card-compact w-1/2 bg-white shadow-l border my-1">
                <div className="card-body">
                    <div className="flex items-center justify-between bg-white text-black">
                        <div className="flex-none">
                            <p>Info</p>
                        </div>
                        <div className="flex-none">
                            <p>Send Commit to register Name</p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="card card-compact w-1/2 bg-grey shadow-l my-1">
                <div className="card-body">
                    <div className="flex items-center justify-between text-black">
                        <div className="flex-none">
                            <p>Est. Network Fee</p>
                        </div>
                        <div className="flex-none">
                            <p>0.0068 ERG</p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-black">
                        <div className="flex-none">
                            <p>Commit Fee</p>
                        </div>
                        <div className="flex-none">
                            <p>0.001 ERG</p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-black">
                        <div className="flex-none">
                            <p className="font-bold">Estimated Total</p>
                        </div>
                        <div className="flex-none">
                            <p>0.0078 ERG</p>
                        </div>
                    </div>
                </div>
            </div>
            <button
                    className="btn bg-customOrange hover:bg-customOrangeDark w-36 text-white border-transparent hover:border-transparent"
                    >Open Wallet</button>
        </div>
)
}
export default CommitFee;