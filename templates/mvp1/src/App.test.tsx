import { screen, waitFor } from "@testing-library/react";

import { App } from "./App";
import { defaultContactCardContent } from "./test-utils/fixtures/contactCardContent";
import { renderWithCdnRouter } from "./test-utils/renderWithCdnRouter";
import {
  CONTACT_CARD_TEST_IDS,
} from "./constants";

describe("App", () => {
  it("reads initialContentJson from cdnRouter and shows every contact field", () => {
    const { mockCdnRouter } = renderWithCdnRouter(<App />, {
      content: defaultContactCardContent,
    });

    expect(
      screen.getByTestId(CONTACT_CARD_TEST_IDS.name),
    ).toHaveTextContent(defaultContactCardContent.name);

    expect(
      screen.getByTestId(CONTACT_CARD_TEST_IDS.headline),
    ).toHaveTextContent(defaultContactCardContent.headline);

    expect(
      screen.getByTestId(CONTACT_CARD_TEST_IDS.bio),
    ).toHaveTextContent(defaultContactCardContent.bio);

    expect(
      screen.getByTestId(CONTACT_CARD_TEST_IDS.email),
    ).toHaveTextContent(defaultContactCardContent.email);

    expect(
      screen.getByTestId(CONTACT_CARD_TEST_IDS.phone),
    ).toHaveTextContent(defaultContactCardContent.phone);

    const heroImage = screen.getByTestId(CONTACT_CARD_TEST_IDS.heroImage);
    expect(heroImage).toHaveAttribute(
      "src",
      expect.stringContaining(defaultContactCardContent.heroImage),
    );

    expect(mockCdnRouter.fetchContentJson).not.toHaveBeenCalled();
  });

  it("fetches content when initialContentJson is missing", async () => {
    const { mockCdnRouter } = renderWithCdnRouter(<App />, {
      content: defaultContactCardContent,
      overrideCdnRouter: {
        initialContentJson: undefined,
      },
    });

    await waitFor(() => {
      expect(mockCdnRouter.fetchContentJson).toHaveBeenCalledWith("main");
    });

    expect(
      screen.getByTestId(CONTACT_CARD_TEST_IDS.name),
    ).toHaveTextContent(defaultContactCardContent.name);

    expect(
      screen.getByTestId(CONTACT_CARD_TEST_IDS.headline),
    ).toHaveTextContent(defaultContactCardContent.headline);

    expect(
      screen.getByTestId(CONTACT_CARD_TEST_IDS.bio),
    ).toHaveTextContent(defaultContactCardContent.bio);

    expect(
      screen.getByTestId(CONTACT_CARD_TEST_IDS.email),
    ).toHaveTextContent(defaultContactCardContent.email);

    expect(
      screen.getByTestId(CONTACT_CARD_TEST_IDS.phone),
    ).toHaveTextContent(defaultContactCardContent.phone);

    const heroImage = screen.getByTestId(CONTACT_CARD_TEST_IDS.heroImage);
    expect(heroImage).toHaveAttribute(
      "src",
      expect.stringContaining(defaultContactCardContent.heroImage),
    );
  });
});
