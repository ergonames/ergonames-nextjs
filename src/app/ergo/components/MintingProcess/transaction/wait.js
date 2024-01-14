import React, { useState, useEffect } from 'react';

function Wait(){
    const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prevSeconds) => {
        if (prevSeconds === 10) {
          clearInterval(interval);
          return 10;
        }
        return prevSeconds + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const progressValue = ((10 - seconds) / 10) * 100;
  return (
        <div className='flex flex-col justify-center items-center'>

            <div className="radial-progress text-customOrange my-2" style={{ '--value': progressValue }} role="progressbar">
                {seconds}s
            </div>
            <p className='text-sm text-black'>This timer helps prevent others from registering the name before you do. </p>
            <p className='text-sm text-black'>Your Name is not registered untill you've completed the second transaction.</p>
        </div>
    )
}
export default Wait;