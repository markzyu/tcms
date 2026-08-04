# Tools and Workflows

In MVP v0.1, Tools and Workflows are mostly intended for use as template content editing UI and previewing UI.

However, the they are meant to be a generic UI equivalent of old shell utilities and pipes. The full architecture of Tools are not entirely settled yet. But just keep in mind that we might eventually also support things like "Image Editor", "Melt / Video Creator", and "API key to XXX backend".

## Definition 1 (functional definition)

* Tools are the smallest unit of a reusable tooling UI, with a specific input type. There are often multiple tools for the same input type, with different purposes.
  * Example: JSON "Array" editor vs JSON "Objects" editor, etc.
  * Tools come with a loader function that determines whether each tool is actually applicable to the current input. Even if the static type matches, the loader can choose to reject the input.
* Workflows are a list of tools that can be chosen for a given input type, to achieve a specific goal.
  * Example: The "Template editor" workflow includes the "JSON Objects editor" tool and the "JSON Array editor" tool.

* Tools and workflows perform "Actions" to achieve their functionality. Actions are a data type describing a smallest unit of operation that can be done by a tool.

## Definition 2 (technical definition)

Tools are stateless in the sense that they do not affect browser history. And they should not rely on access to any persistent state other than their input props.

Workflows are stateful. There is a unique URL to each instance of a workflow. They also have access to a state in session storage, which is currently only used to pass the input data to the workflow.

In MVP v0.1, we have not implemented persistent workflow context (which can change during the course of a workflow). But this should be supported in future versions.

### Actions

Actions are a descriptive data created such that, individual tools do not need to call Tauri/OS APIs directly. Instead, all I/O must be done using a custom Action, as defined in `src/tools/toolTypes.ts`. This OS API boundary isn't particularly enforcible at the moment. But it's meant to allow future redesigns (so that tools can be more dynamic, or so that tools can run in a sandboxed iframe instead)

(Workflows are not limited to Actions, and in fact have access to session storage, because they are just a data type that tell the workflow orchestrator what to do. All tooling code lives in Tool components. And the workflow orchestrator itself lives in the Admin shell)

### Connecting workflows to each other

Tools and workflows **do not return anything** other than the promise of the boolean "isSuccess" flag, indicating when/whether the workflow completed successfully. Instead of outputting the result in the promise, they rely on Actions to write output files, or to start secondary workflows.

When a secondary workflow finishes, the workflow orchestrator / admin shell doesn't actually "resume" from the original workflow as if the components were never unmounted. Instead, the original workflow will restart from the saved input states (which are just references) + the new input data.

(The edited data is not being passed in the pipe as if these are shell commands. Instead, the workflow/pipe of tools shares references to a location which they take turns writing to. For temporary files / intermediate data, admin shell needs to create the reference filenames and cleanup accordingly.)

This lack of a return value in the workflow contract, necessitates a **tracking rule:** 

> If a workflow intends to allow "Image Editor workflow" to be started from the "Template editor workflow", then any new images a user saved in the "Image Editor workflow" must remain on disk (and be tracked in CAS storage) even if the "Template editor workflow" is later cancelled.

And this should be the generic default behavior for all workflows, unless they were specifically called on temporary input data, in which case, if the caller/creator of the temporary session is cancelled, then by definition, the data is not meant to be persisted. (However, if the caller was to complete successfully, then the data should be persisted.)

### OS Path abstractions

Because we need to define references to any data on disk, without exposing said data as direct in-memory refs, 

And because we need this to work on iOS, Android, macOS, Windows and Linux, we need to have an abstraction layer for OS paths.

Please refer to the `GenericFilePathSchema` in `src/tools/toolTypes.ts` for the current definition.

## Example: Template editor wokflow with a secondary Image Editor workflow

* Workflow: `template-editor`: meant to edit an existing JSON content
  * Input type: `jsonWithSchema`
  * Tool: `json-objects-editor`
  * Tool: `json-array-editor`
* Workflow: `image-editor`: meant to edit an existing image file
  * Input type: `mediaFilePath`
  * Tool: `image-editor`

Example States, when editing an image field of a JSON content:

* Admin Shell: refreshes the JSON content from `content/main.en.json` when all workflows complete.
* Workflow `template-editor`:
  * Starts the `image-editor` workflow using a `mediaFilePath` matching the image being clicked/edited.
  * refreshes the media preview from `mediaFilePath` when `image-editor` completes.
  * writes the updated JSON content to `content/main.en.json` using Actions.
* Workflow `image-editor`:
  * writes the updated image file to `mediaFilePath` using Actions.
  * CAS storage tracks the new file / edit history, regardless of whether `template-editor` completes successfully or not.

One caveat here is that, upon return from `image-editor`, the `template-editor` workflow will restart and lose UI scroll position. This is fine for MVP v0.1. But in later versions, we should store important UI state as additional context (not part of input data) in session storage.

## Example: Future feature: fully automatic video processing, subtitling workflow

* Admin Shell: starts the `automated` workflow which contains all automatable tools
  * The `automated` workflows requires input: (1) a script describing the steps (2) any file/json location that the script references/outputs to.
  * Upon success, the admin shell updates relevant instances that rely on the updated references.
* WorkflowOrchestrator in special `automated` mode:
  * Iterates through the script steps, and starts the corresponding tool for each step.
  * If a tool fails, the `automated` workflow fails (unless the script is configured with failure handling)
  * If a tool completes successfully, the `automated` workflow continues to the next step.

This could easily allow chaining video processors and subtitle workflows, in an `automated` script.

> Note: Even in `automated` mode, the entire WorkflowOrchestrator is still presented in an UI, because on mobile OS, the app needs to remain in foreground to run at full speed. (But it should no longer switch between workflow instances and should remain stable no matter which step it is on.)

> But this means automated workflow tools must enforce idempotent input refs, and must support checkpointing in a way that works well with the existing "restart from input state" UI lifecycles. And as a result, not every tool can be an "automated" tool.

> The `startWorkflow` action already supports a `presentation` mode. This should eventually be expanded to support an `automated` mode. As for UI, some automated tools might not have a UI at all. But the workflow UI itself still needs to stay in foreground to run at full speed.

But we should also allow parallel execution of multiple workflows at once, ONLY IF these workflows are used in an automation. (They won't be showing a full screen UI in this case, but maybe only a progress bar and a "Cancel" button.)

And nothing executes in parallel by default, unless the script explicitly asks for it in the style of a Map-Reduce script, and specifies a non overlapping list of reference paths for the "Map" phase.

Thoughts:

> I was thinking to make the map-phase use temporary file paths only. But this turned out to be unnecessary because CAS already tracks old versions of these files. What we need instead, is just the guarantee that, **when CAS is implemented**, any "writeable" ToolAction creates new files, instead of writing to the CAS backend in place (thus corrupting the old version)