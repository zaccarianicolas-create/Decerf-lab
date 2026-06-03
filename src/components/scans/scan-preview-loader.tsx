"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const Inner = dynamic(
  () => import("./scan-preview-impl").then((m) => m.ScanPreviewImpl),
  { ssr: false }
);

export function ScanPreview(
  props: ComponentProps<typeof import("./scan-preview-impl").ScanPreviewImpl>
) {
  if (!props.open) return null;
  return <Inner {...props} />;
}
