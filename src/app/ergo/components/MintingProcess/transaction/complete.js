import React, { useState, useEffect } from 'react';


const Complete = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prevProgress) => {
        // Update the progress, stop at 100%
        if (prevProgress < 100) {
          return prevProgress + 1;
        } else {
          clearInterval(interval);
          return 100;
        }
      });
    }, 50); // Adjust the interval as needed for the desired animation speed

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="progress-bar-container">
      <div className="progress-bar">
        <div className="progress-button" style={{ left: `${progress}%` }} />
      </div>
    </div>
  );
};

export default Complete;
