import { screen, waitFor } from "@testing-library/react";

import { App } from "./App";
import { defaultContactCardContent } from "./test-utils/fixtures/contactCardContent";
import { renderWithCdnBridge } from "./test-utils/renderWithCdnBridge";
import {
  CONTACT_CARD_TEST_IDS,
} from "./constants";

describe("App", () => {
  it("reads initialContentJson from cdnBridge and shows every contact field", () => {
    const { mockCdnBridge } = renderWithCdnBridge(<App />, {
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

    expect(mockCdnBridge.fetchContentJson).not.toHaveBeenCalled();
  });

  it("fetches content when initialContentJson is missing", async () => {
    const { mockCdnBridge } = renderWithCdnBridge(<App />, {
      content: defaultContactCardContent,
      overrideCdnBridge: {
        initialContentJson: undefined,
      },
    });

    await waitFor(() => {
      expect(mockCdnBridge.fetchContentJson).toHaveBeenCalledWith("main");
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
