import { port } from "@hex-di/core";

export const RequestIdPort = port<string>()({ name: "RequestId" });
