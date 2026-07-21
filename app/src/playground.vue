<template>
  <p>Output of "<strong>{{ libraryName }}</strong>" library:</p>
  <pre>{{ libraryOutput || "(No output)" }}</pre>
</template>

<script setup lang="ts">
import IntlMessageFormat from 'intl-messageformat';
import { computed } from 'vue';
import { z } from 'zod';

const props = defineProps<{
  libraryName: "intl-messageformat";
  libraryInput: {
    message: string;
    locale: string;
    variables: Record<string, any>;
  };
} | {
  libraryName: "zod";
  libraryInput: {
    schemaName: string;
    json: any;
  }
}>();

const exampleZodEnum = z.enum(["a", "b", "c"]);
const predefinedZodSchemas: Record<string, z.ZodSchema> = {
  "enumRecord": z.record(exampleZodEnum, z.string()),
};

const libraryOutput = computed(() => {
  try {
    if (props.libraryName === "intl-messageformat") {
      return new IntlMessageFormat(props.libraryInput.message, props.libraryInput.locale).format(props.libraryInput.variables);
    }
    if (props.libraryName === "zod") {
      return predefinedZodSchemas[props.libraryInput.schemaName]?.parse(props.libraryInput.json);
    }
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
});
</script>