import { PageContentProvider } from "@tcms/mini-app-react-utils";
import { GameCanvas } from "./GameCanvas";

export function App() {
  return (
    <div className="w-full h-full">
      <PageContentProvider pageShortName="main">
        <GameCanvas />
      </PageContentProvider>
    </div>
  );
}
