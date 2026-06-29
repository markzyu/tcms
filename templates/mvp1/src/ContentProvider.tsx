import { createContext, useContext, useEffect, useState } from "react";

type PageContentContextType<T = unknown> = {
  isLoading: boolean;
  contentJson?: T;
};

const PageContentContext = createContext<PageContentContextType>({
  isLoading: true,
});

export type PageContentProviderProps = {
  pageShortName?: string;
  children: React.ReactNode;
};

export function PageContentProvider(props: PageContentProviderProps) {
  const { children, pageShortName = "main" } = props;
  const initialContentJson = window.pcms.cdnRouter.initialContentJson;
  const [isLoading, setIsLoading] = useState(!initialContentJson);
  const [contentJson, setContentJson] = useState(initialContentJson);

  useEffect(() => {
    (async () => {
      if (initialContentJson) {
        return;
      }
      setIsLoading(true);
      try {
        const contentJson = await window.pcms.cdnRouter.fetchContentJson(pageShortName);
        setContentJson(contentJson);
      } catch (error) {
        console.error("Cannot load content for page", pageShortName, error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [pageShortName]);

  return (
    <PageContentContext.Provider value={{ contentJson, isLoading }}>
      {children}
    </PageContentContext.Provider>
  );
}

export function usePageContentContext<T = unknown>(): PageContentContextType<T> {
  return useContext(PageContentContext) as PageContentContextType<T>;
}
