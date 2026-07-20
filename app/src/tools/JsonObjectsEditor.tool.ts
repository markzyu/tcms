import { Tool } from "./toolTypes";

export const JsonObjectsEditorTool: Tool = {
  id: "json-objects-editor",
  inputType: "jsonWithSchema",
  onLoad() {
    return {
      loader: import("./JsonObjectsEditor.vue"),
    };
  },
}