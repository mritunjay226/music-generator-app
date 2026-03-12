import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { generateMusic, repaintMusic } from "../../../inngest/functions";

// Create an API that serves zero or more functions
export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [
        generateMusic,
        repaintMusic,
    ],
});
