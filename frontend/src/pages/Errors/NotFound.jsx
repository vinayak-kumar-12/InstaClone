import React from "react";
import { Link } from "react-router-dom";
import { HelpCircle } from "lucide-react";
import { motion } from "framer-motion";

const NotFound = () => {
  return (
    <div className="min-h-screen w-full bg-[#101114] text-white flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-md text-center space-y-6"
      >
        <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-400">
          <HelpCircle size={40} />
        </div>
        
        <h1 className="text-4xl font-bold">Page Not Found</h1>
        
        <p className="text-gray-400 text-lg">
          The link you followed may be broken, or the page may have been removed.
        </p>

        <div className="pt-4">
          <Link
            to="/home"
            className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-700 font-semibold rounded-xl transition duration-200 cursor-pointer text-center w-full"
          >
            Go Back to Instagram
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
