import { defineEval } from "@grok/agent-sdk/evals";

export default defineEval({
  tags: ["smoke"],
  description: "Jarvis lists capabilities via the registry tool.",
  async test(t) {
    await t.send(
      'List your capabilities using the list_capabilities tool. Reply briefly.',
    );
    t.succeeded();
    t.calledTool("list_capabilities");
  },
});
