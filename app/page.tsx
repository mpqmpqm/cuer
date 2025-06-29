"use client";

import { Scene } from "@/app/scene/scene";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { match, P } from "ts-pattern";
import { z } from "zod";
import { completion } from "./ai/completion";
import { Vec3 } from "./scene/grid";

const colors = [
  "#ff0000",
  "#00ff00",
  "#0000ff",
  "#ffff00",
  "#ff00ff",
  "#00ffff",
  "#ff8800",
  "#0088ff",
  "#8800ff",
  "#00ff88",
  "#ff0088",
  "#880000",
];

const _stick: Array<Vec3> = [
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
];

export default function Home() {
  const [points, setPoints] = useState<Array<Vec3>>(_stick);
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formSchema = z.object({
      query: z.string().min(1, "Query is required"),
      model: z.enum(["openai", "claude"]),
    });

    const pointSchema = z.object({
      x: z.number(),
      y: z.number(),
      z: z.number(),
    });

    const responses = await Promise.all([
      completion({
        ...formSchema.parse(Object.fromEntries(new FormData(event.currentTarget))),
        state: points,
      }),
    ]).then((responses) =>
      responses.map((res) =>
        match(res)
          .with(P.array({ input: P._ }), (calls) =>
            calls.map(({ input }) => pointSchema.parse(input))
          )
          .with(P.array({ arguments: P._ }), (calls) =>
            calls.map(({ arguments: args }) => pointSchema.parse(JSON.parse(args)))
          )
          .run()
      )
    );

    const next = responses.flatMap((matches) =>
      matches.map((m): Vec3 => [-m.x, m.y, m.z])
    );
    console.log("Next points:", next);
    setPoints(next);
  };

  return (
    <div className="grid grid-rows-[1fr_auto] h-screen w-screen">
      <Scene points={points} colors={colors} />
      <form onSubmit={handleSubmit} className="flex gap-2 m-2">
        <Input name="query" placeholder="Enter your query" />
        <Select name="model" defaultValue="openai">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="openai">OpenAI</SelectItem>
            <SelectItem value="claude">Claude</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit">Submit</Button>
      </form>
    </div>
  );
}
