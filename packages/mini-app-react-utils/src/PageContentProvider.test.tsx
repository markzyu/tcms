import { screen, waitFor } from "@testing-library/react";
import { renderWithCdnBridge } from "@tcms/mini-app-react-test-utils";

import { PageContentProvider, usePageContentContext } from "./PageContentProvider";

type BasicContent = {
  title: string;
};

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
      <PageContentProvider>
        <BasicContentView />
      </PageContentProvider>,
      { content: basicContent },
    );

    expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
    expect(screen.getByTestId("title")).toHaveTextContent("Hello world");
  });

  it("sets isLoading until fetchContentJson resolves when initialContentJson is missing", async () => {
    const { mockCdnBridge } = render(
      <PageContentProvider>
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
    expect(mockCdnBridge.fetchContentJson).toHaveBeenCalledWith("main");
  });
});
