import { screen, waitFor } from "@testing-library/react";
import { renderWithCdnBridge } from "@pcms/mini-app-react-test-utils";
import { z } from "zod";

import { PageContentProvider, usePageContentContext } from "./PageContentProvider";

const basicContentSchema = z.object({
  title: z.string(),
});

type BasicContent = z.infer<typeof basicContentSchema>;

const basicContent: BasicContent = {
  title: "Hello world",
};

function BasicContentView() {
  const { contentJson, isLoading } = usePageContentContext<BasicContent>();

  if (isLoading) {
    return <div data-testid="loading">Loading</div>;
  }

  return <div data-testid="title">{contentJson?.title ?? ""}</div>;
}

const render = renderWithCdnBridge<BasicContent>;

describe("PageContentProvider", () => {
  it("exposes contentJson synchronously when initialContentJson exists", () => {
    render(
      <PageContentProvider contentSchema={basicContentSchema}>
        <BasicContentView />
      </PageContentProvider>,
      { content: basicContent },
    );

    expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
    expect(screen.getByTestId("title")).toHaveTextContent("Hello world");
  });

  it("sets isLoading until fetchContentJson resolves when initialContentJson is missing", async () => {
    const { mockCdnBridge } = render(
      <PageContentProvider contentSchema={basicContentSchema}>
        <BasicContentView />
      </PageContentProvider>,
      {
        content: basicContent,
        overrideCdnBridge: {
          initialContentJson: undefined,
        },
      },
    );

    expect(screen.getByTestId("loading")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("title")).toHaveTextContent("Hello world");
    });

    expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
    expect(mockCdnBridge.fetchContentJson).toHaveBeenCalledWith("main", expect.any(Function));
  });
});
