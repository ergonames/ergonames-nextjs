"use client"
import Connector from "../Connector/connector";
import { useRouter } from 'next/navigation';


function Navigation() {
    const router = useRouter();
    return (
      <div className="bg-black p-1 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <img
              src="ergo.png"
              alt="Logo"
              className="w-64 h-16 object-cover"
              onClick={()=>router.push("/")}
            />
          </div>
          <div className="ml-auto">
            <Connector />
          </div>
        </div>
      </div>
    );
}


export default Navigation;
/* Navbar Logo */
