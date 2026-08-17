import { screen, waitFor } from "@testing-library/react";
import { renderWithCdnBridge } from "@tcms/mini-app-react-test-utils";

import { App } from "./App";
import type { GameConfig } from "./content/gameConfig";
import { defaultGameConfig } from "./content/gameConfig.mock";
import {
  CONTACT_CARD_TEST_IDS,
} from "./constants";

const render = renderWithCdnBridge<GameConfig>;

describe("App", () => {
  it.skip("reads initialContentJson from cdnBridge and shows every contact field", () => {
    const { mockCdnBridge } = render(<App />, {
      content: defaultGameConfig,
    });
  });
});
