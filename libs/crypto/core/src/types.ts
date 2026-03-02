export interface HashDigest {
  readonly sha256Hex: (data: string) => string;
  readonly timingSafeEqual: (a: string, b: string) => boolean;
}
