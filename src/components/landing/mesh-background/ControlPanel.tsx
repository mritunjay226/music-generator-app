import React from "react";
import { Leva } from "leva";

export default function ControlPanel() {
  return (
    <div className="hidden sm:block absolute bottom-8 right-8 z-50 w-72">
      <Leva fill titleBar={{ title: 'Mesh Settings' }} />
    </div>
  );
}
