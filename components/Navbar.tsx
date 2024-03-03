import React from "react";
import SettingPopup from "./SettingPopup";
import { Logo } from "./Logo";
import ConnectWallet from "@/components/wallet/ConnectWallet";
import DropDown from "@/components/wallet/DropDown";
import { Socket } from "socket.io-client";
import { DefaultEventsMap } from "@socket.io/component-emitter";

interface IProps {
  activeTab: string;
  setActiveTab: Function;
  socket: Socket<DefaultEventsMap, DefaultEventsMap> | undefined;
}

const Navbar = (props: IProps) => {
  const { activeTab, setActiveTab, socket } = props;
  return (
    <>
      <nav className="flex container items-center justify-between mx-auto px-2 sm:px-3 lg:px-5 py-4">
        <span className="mr-3">
          <Logo />
        </span>

        <div className="flex items-center space-x-3 sm:space-x-4">
          <SettingPopup />
          <DropDown />

          <div className="hidden sm:block">
            <ConnectWallet socket={socket} />
          </div>
        </div>
      </nav>

      <div className="sm:hidden w-full ">
        <ConnectWallet socket={socket} />
      </div>
      <div className="primary-gradient w-full py-3 text-center flex items-center space-x-12 sm:space-x-20 justify-center">
        <button
          onClick={() => setActiveTab("hodlerg")}
          className={`text-white font-medium font-inter text-lg uppercase transition-all duration-200 ease-in-out after:transition-all
           after:ease-in-out after:duration-200 relative after:absolute after:-bottom-[11px] after:left-1/2 after:-translate-x-1/2 after:bg-white after:h-1 ${
             activeTab === "hodlerg" ? "after:w-[130%] " : "after:w-0"
           }`}
        >
          HODLERG 3%
        </button>
        <button
          onClick={() => setActiveTab("refund")}
          className={`text-white font-medium font-inter text-lg uppercase transition-all duration-200 ease-in-out after:transition-all
           after:ease-in-out after:duration-200 relative after:absolute after:-bottom-[11px] after:left-1/2 after:-translate-x-1/2 after:bg-white after:h-1 ${
             activeTab === "refund" ? "after:w-[130%] " : ""
           }`}
        >
          Refund
        </button>
      </div>
    </>
  );
};

export default Navbar;
