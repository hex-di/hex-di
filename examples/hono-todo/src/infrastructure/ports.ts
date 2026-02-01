import { createPort } from "@hex-di/core";

export const RequestIdPort = createPort<"RequestId", string>("RequestId");
