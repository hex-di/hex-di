import { createPort } from "@hex-di/ports";

export const RequestIdPort = createPort<"RequestId", string>("RequestId");
