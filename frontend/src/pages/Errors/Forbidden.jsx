import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

const Forbidden = () => {
  return (
    <div className="min-h-screen w-full bg-[#101114] text-white flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-md text-center space-y-6"
      >
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500">
          <ShieldAlert size={40} />
        </div>
        
        <h1 className="text-4xl font-bold">Access Denied</h1>
        
        <p className="text-gray-400 text-lg">
          You do not have permission to view this resource. Check your credentials and try again.
        </p>

        <div className="pt-4">
          <Link
            to="/home"
            className="inline-block px-8 py-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 font-semibold rounded-xl transition duration-200 cursor-pointer text-center w-full"
          >
            Go to Feed
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Forbidden;
