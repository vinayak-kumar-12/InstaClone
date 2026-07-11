import React from "react";
import { ServerCrash } from "lucide-react";
import { motion } from "framer-motion";

const ServerError = () => {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen w-full bg-[#101114] text-white flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-md text-center space-y-6"
      >
        <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center mx-auto text-yellow-500">
          <ServerCrash size={40} />
        </div>
        
        <h1 className="text-4xl font-bold">500 - Server Error</h1>
        
        <p className="text-gray-400 text-lg">
          The server encountered an internal error or misconfiguration and was unable to complete your request.
        </p>

        <div className="pt-4">
          <button
            onClick={handleReload}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 font-semibold rounded-xl transition duration-200 cursor-pointer text-center w-full"
          >
            Reload Page
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ServerError;
