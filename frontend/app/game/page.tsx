"use client";

import { useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";

export default function Login() {
  const [name, setName] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post("http://localhost:3001/login", {
        name,
      });
      const { token } = response.data;
      console.log(token);

      // Save token in cookie with proper settings
      Cookies.set("guest", token, { expires: 1 });

      console.log("Login successful");

      // Redirect to game page after successful login
      router.push(`/game/random`);
    } catch (error) {
      setError("Login failed, please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen text-textMain">
      <h1 className="text-4xl font-bold mb-8 text-center text-green-500 drop-shadow-lg">
        Enter the Game World
      </h1>
      <div className="bg-bgAuxiliary2 rounded-lg shadow-lg p-8 flex flex-col md:flex-row">
        <div className="flex flex-col items-center md:ml-8">
          <div className="flex items-center mb-4">
            <div className="bg-gray-600 h-1 w-12 mr-2"></div>
            <span className="text-gray-400">OR</span>
            <div className="bg-gray-600 h-1 w-12 ml-2"></div>
          </div>
          <form onSubmit={handleLogin}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Username"
              className="border px-4 py-2 rounded-md mb-4 w-full md:w-64"
              required
            />
            <button
              type="submit"
              className={`bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors duration-300 ${
                loading ? "opacity-50" : ""
              }`}
              disabled={loading}
            >
              {loading ? "Logging in..." : "Enter as guest"}
            </button>
            {error && <p className="text-red-500 mt-4">{error}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}
