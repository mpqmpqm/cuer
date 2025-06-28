"use client";

import { Scene } from "@/app/scene/scene";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { z } from "zod";
import { completion } from "./ai/completion";
import { Vec3 } from "./scene/grid";

const colors = ["#ff0000"];

export default function Home() {
  const [points, setPoints] = useState<Array<Vec3>>([
    [0, 2, 1.25],
    [0, 1, 1.25],
    [-0.75, 1, 1.25],
    [0.75, 1, 1.25],
    [-0.75, 0, 1.25],
    [0.75, 0, 1.25],
    [0, -1, 1.25],
    [-0.75, -1, 1.25],
    [0.75, -1, 1.25],
    [-0.75, -3, 1.25],
    [0.75, -3, 1.25],
    [-0.75, -2, 1.25],
    [0.75, -2, 1.25],
  ]);
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const tool_call = await completion(new FormData(event.currentTarget));
    const parsed = JSON.parse(tool_call.function.arguments);
    const point = z
      .object({
        x: z.number(),
        y: z.number(),
        z: z.number(),
      })
      .parse(parsed);
    setPoints((prevPoints) => [...prevPoints, [-point.x, point.y, point.z]]);
  };

  return (
    <div className="grid grid-rows-[1fr_auto] h-screen w-screen">
      <Scene points={points} colors={colors} />
      <form onSubmit={handleSubmit} className="flex gap-2 m-2">
        <Input name="query" placeholder="Enter your query" />
        <Button type="submit">Submit</Button>
      </form>
    </div>
  );
}
