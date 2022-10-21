import React, { useEffect, useState } from 'react';
import {Link} from "react-router-dom";
import { ErgoDappConnector } from '../Requirements/Requirements';

function Navbar() {
    const [ergoPay, setErgoPay] = useState(false);
    // const [ergoPay, setErgoPay] = ergopay;
    return (
        <div className="text-white py-4">
            <div className="float-right pr-8">
            <ErgoDappConnector ergopayProps={[ergoPay, setErgoPay]} color={'purple'} />
            </div>
        </div>
    );
}

export default Navbar;