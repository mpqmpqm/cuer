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

const _stick: Record<string, Vec3> = {
  head: [0, 2, 1.25],
  chest: [0, 1, 1.25],
  rightShoulder: [-0.75, 1, 1.25],
  leftShoulder: [0.75, 1, 1.25],
  rightHand: [-0.75, 0, 1.25],
  leftHand: [0.75, 0, 1.25],
  // sacrum: [0, -1, 1.25],
  rightHip: [-0.75, -1, 1.25],
  leftHip: [0.75, -1, 1.25],
  rightKnee: [-0.75, -3, 1.25],
  leftKnee: [0.75, -3, 1.25],
  leftFoot: [-0.75, -2, 1.25],
  rightFoot: [0.75, -2, 1.25],
};

export default function Home() {
  const [points, setPoints] = useState(_stick);
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

    const figureSchema = z.object({
      head: pointSchema,
      chest: pointSchema,
      rightShoulder: pointSchema,
      leftShoulder: pointSchema,
      rightHand: pointSchema,
      leftHand: pointSchema,
      // sacrum: pointSchema,
      rightHip: pointSchema,
      leftHip: pointSchema,
      rightKnee: pointSchema,
      leftKnee: pointSchema,
      leftFoot: pointSchema,
      rightFoot: pointSchema,
    });

    const responses = await Promise.all([
      completion({
        ...formSchema.parse(Object.fromEntries(new FormData(event.currentTarget))),
        state: points,
      }),
    ]).then((responses) =>
      responses.map((res) =>
        match(res)
          .with(P.array({ name: "pose", input: P._ }), (calls) =>
            calls.map(({ input }) => figureSchema.parse(input))
          )
          .with(P.array({ name: "pose", arguments: P.string }), (calls) =>
            calls.map(({ arguments: args }) => figureSchema.parse(JSON.parse(args)))
          )
          // .with(P.array({ name: "plot", input: P._ }), (calls) =>
          //   calls.map(({ input }) => pointSchema.parse(input))
          // )
          // .with(P.array({ arguments: P._ }), (calls) =>
          //   calls.map(({ arguments: args }) => pointSchema.parse(JSON.parse(args)))
          // )
          .run()
      )
    );

    setPoints(
      Object.fromEntries(
        Object.entries(responses[0][0]).map(([key, value]) => [
          key,
          [value.x, value.y, value.z],
        ])
      )
    );
  };

  return (
    <div className="grid grid-rows-[1fr_auto] h-screen w-screen">
      <Scene points={Object.values(points)} colors={colors} />
      <form onSubmit={handleSubmit} className="flex gap-2 m-2">
        <Input name="query" placeholder="Enter your query" />
        <Select name="model" defaultValue="claude">
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
