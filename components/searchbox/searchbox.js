import { useState } from "react";
import { resolve_ergoname } from "ergonames";
// import { sendTransaction } from "@fleet-sdk/core";

function SearchBox() {
    const [searchName, setSearchName] = useState("");
    const [resolvedAddress, setResolvedAddress] = useState("");
    const [hasResolved, setHasResolved] = useState(false);
    const [tokenId, setTokenId] = useState("");
    const [ergonamePrice, setErgonamePrice] = useState(0);
    const [registeredAddress, setRegisteredAddress] = useState("");
    const [resolvedPrice, setResolvedPrice] = useState(0);
    const [resolvedDate, setResolvedDate] = useState("");

    const submitSearch = async () => {
        // console.log(`Searching for: ${searchName}`);
        // let addr = await resolve_ergoname(searchName);
        // if (addr === null) {
        //   setResolvedAddress("");
        // } else {
        //   setResolvedAddress(addr);
        // };
        // console.log(`Resolved address: ${resolvedAddress}`);
        // setRegisteredAddress("3WwKzFjZGrtKAV7qSCoJsZK9iJhLLrUa3uwd4yw52bVtDVv6j5TL");
        // setTokenId("dd43910d75f32a8598c345a578f26e86b90e95dda967f9df3e45eaa1d7dae579");
        // setErgonamePrice(300000000);
        // setResolvedPrice(300000000);
        // setResolvedDate("Oct 12, 2022");
        // setHasResolved(true);
      };
    
      const registerName = async () => {
        console.log(`Registering name: ${searchName}`);
        window.ergoConnector.nautilus.connect().then(async () => {
          console.log("Connected to Nautilus");
          // let raddr = window.ergo.get_change_address();
          let raddr = window.localStorage.getItem("walletAddress");
          console.log(`Address: ${raddr}`);
          // let tx = await sendTransaction(ergonamePrice, searchName, raddr);
          // console.log(`TX: ${tx}`);
        })
      };

      const exploreAddress = async () => {
        console.log(`Exploring address: ${resolvedAddress}`);
        window.open('https://testnet.ergoplatform.com/en/addresses/' + resolvedAddress, '_blank');
      };

      const postAPIInformation = async (txId, boxId) => {
        console.log("Sending API request");
        let url = process.env.REACT_APP_API_REQUEST_URL;
        let data = {
          "paymentTxId": txId,
          "mintingRequestBoxId": boxId,
        };
        let response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });
        let json = await response.json();
        console.log(json);
      };

      const copyTokenId = () => {
        navigator.clipboard.writeText(resolvedAddress);
      };

      const copyResolvedAddress = () => {
        navigator.clipboard.writeText(resolvedAddress);
      };

      const copyRegisteredAddress = () => {
        navigator.clipboard.writeText(registeredAddress);
      };

    if (!hasResolved) {
        return (
            <div>
              <div className="mx-auto mt-36 w-[45%] h-[450px] rounded-xl bg-gray-700/50">
                <h1 className="text-white pb-2 pt-4 pl-8 text-2xl font-bold">Search</h1>
                <div className="mx-auto my-4 block">
                  <input type="text" className="ml-[9%] w-3/5 mx-auto my-2 px-2 py-3 bg-gray-500 text-black placeholder:text-black" placeholder="Enter an ErgoName..." onChange={(e) => setSearchName(e.target.value)} />
                  <button className="mx-auto my-2 w-1/5 bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-4" onClick={submitSearch}>Search</button>
                </div>
              </div>
            </div>
        );
      } else {
        if (resolvedAddress !== "") {
          return (
              <div>
                <div className="mx-auto mt-36 w-[45%] h-[450px] rounded-xl bg-gray-700/50">
                <h1 className="text-white pb-2 pt-4 pl-8 text-2xl font-bold">Search</h1>
                <div className="mx-auto my-4 block">
                    <input type="text" className="ml-[9%] w-3/5 mx-auto my-2 px-2 py-3 bg-gray-500 text-black placeholder:text-black" placeholder="Enter an ErgoName..." onChange={(e) => setSearchName(e.target.value)} />
                    <button className="mx-auto my-2 w-1/5 bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-4" onClick={submitSearch}>Search</button>
                </div>
                <div>
                  <h1 className="text-white pl-8 pt-4 pb-2 font-bold text-xl">ErgoName Registration Information</h1>
                  <h1 className="text-white pb-1 pl-8 font-bold">Token Id: <button onClick={copyTokenId} className="text-white font-bold hover:text-gray-500 duration-300">{tokenId}</button></h1>
                  <h1 className="text-white pb-1 pl-8 font-bold">Current Owner: <button onClick={copyResolvedAddress} className="text-white font-bold hover:text-gray-500 duration-300">{resolvedAddress}</button></h1>
                  <h1 className="text-white pb-1 pl-8 font-bold">Registered By: <button onClick={copyRegisteredAddress} className="text-white font-bold hover:text-gray-500 duration-300">{registeredAddress}</button></h1>
                  <h1 className="text-white pb-1 pl-8 font-bold">Registered For: <span className="text-white font-bold">{resolvedPrice / 1e9}</span> Erg</h1>
                  <h1 className="text-white pb-1 pl-8 font-bold">Registered On: <span className="text-white font-bold">{resolvedDate}</span></h1>
                </div>
                <button className="block mx-auto my-8 bg-blue-500 hover:bg-blue-700 text-white text-2xl font-bold py-2 px-4 rounded" onClick={exploreAddress}>Explore Address</button>
                </div>
              </div>
          );
        } else {
          return (
              <div>
                <div className="mx-auto mt-36 w-[45%] h-[450px] rounded-xl bg-gray-700/50">
                <h1 className="text-white pb-2 pt-4 pl-8 text-2xl font-bold">Search</h1>
                <div className="mx-auto my-4 block">
                    <input type="text" className="ml-[9%] w-3/5 mx-auto my-2 px-2 py-3 bg-gray-500 text-black placeholder:text-black" placeholder="Enter an ErgoName..." onChange={(e) => setSearchName(e.target.value)} />
                    <button className="mx-auto my-2 w-1/5 bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-4" onClick={submitSearch}>Search</button>
                </div>
                <div>
                  <h1 className="text-white pl-8 pt-4 font-bold text-xl">ErgoName Registration Information</h1>
                  <h1 className="text-white pl-8 pt-4 text-xl">Price: <span className="text-white font-bold">{ergonamePrice / 1e9}</span> Erg</h1>
                </div>
                  <button className="block mx-auto my-8 bg-blue-500 hover:bg-blue-700 text-white text-2xl font-bold py-2 px-4 rounded" onClick={registerName}>Register Now</button>
                </div>
              </div>
          );
        };
    };
}

export default SearchBox;