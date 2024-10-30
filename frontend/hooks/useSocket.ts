"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { headers } from "next/headers";
import { useUser } from "@clerk/nextjs";

const WS_URL = "ws://localhost:8080";

export const useSocket = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);

  const { user } = useUser();

  useEffect(() => {
    if (!user) return;

    const ws = new WebSocket(
      `${WS_URL}?name=${user.fullName}&userId=${user.id}`
    );

    ws.onopen = () => {
      console.log("WebSocket connected");
      setSocket(ws);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setSocket(null);
    };

    return () => {
      ws.close();
    };
  }, [user]);

  return { socket, user };
};
