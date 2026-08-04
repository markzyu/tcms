This project makes use of AI in the following ways:

* Most of the markdown documentations files are generated initially by AI, based on a summary of my original ideas.
* Most of the code, except unit tests, is written by a human with indirect AI assistance, including:
  * Using Cursor Tab alongside Vim mode to bulk edit code and long variable names/paths.
  * Using AI Agent to generate boilerplate or to perform repetitive refactors.
  * Using AI modes to review and suggest changes to the code.
* Unit tests are written by AI and reviewed by a human.
  * However, I chose the testing frameworks, based on my previous experiences with Jest and React Testing Library.
  * I also occasionally fix the flaky tests that AI generated.

Though AI has guided with early brainstorming of possible code and possible design choices, ultimately, I chose to use AI as an accelerator tool, instead of a replacement for human judgement.