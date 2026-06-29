import "@pcms/mini-app-common";
import { createContext, useContext, useEffect, useState } from "react";
import type { ZodType } from "zod";

type PageContentContextType<T = unknown> = {
  isLoading: boolean;
  contentJson?: T;
};

const PageContentContext = createContext<PageContentContextType>({
  isLoading: true,
});

export type PageContentProviderProps<T> = {
  pageShortName?: string;
  contentSchema: ZodType<T>;
  children: React.ReactNode;
};

function parseContent<T>(schema: ZodType<T>, raw: unknown): T | undefined {
  const result = schema.safeParse(raw);
  if (!result.success) {
    console.error("Invalid content JSON", result.error.flatten());
    return undefined;
  }
  return result.data;
}

export function PageContentProvider<T>(props: PageContentProviderProps<T>) {
  const { children, pageShortName = "main", contentSchema } = props;
  const initialRawContent = window.pcms.cdnBridge.initialContentJson;
  const parsedInitialContent =
    initialRawContent === undefined
      ? undefined
      : parseContent(contentSchema, initialRawContent);
  const [isLoading, setIsLoading] = useState(initialRawContent === undefined);
  const [contentJson, setContentJson] = useState(parsedInitialContent);

  useEffect(() => {
    (async () => {
      if (initialRawContent !== undefined) {
        return;
      }
      setIsLoading(true);
      try {
        const fetchedContent = await window.pcms.cdnBridge.fetchContentJson(
          pageShortName,
          (raw) => {
            const parsed = parseContent(contentSchema, raw);
            if (parsed === undefined) {
              throw new Error(`Invalid content JSON for page "${pageShortName}"`);
            }
            return parsed;
          },
        );
        setContentJson(fetchedContent);
      } catch (error) {
        console.error("Cannot load content for page", pageShortName, error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [contentSchema, initialRawContent, pageShortName]);

  return (
    <PageContentContext.Provider value={{ contentJson, isLoading }}>
      {children}
    </PageContentContext.Provider>
  );
}

export function usePageContentContext<T = unknown>(): PageContentContextType<T> {
  return useContext(PageContentContext) as PageContentContextType<T>;
}
