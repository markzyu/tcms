import { ContactCard } from "./ContactCard";
import { PageContentProvider } from "./ContentProvider";

export function App() {
  return (
    <div className="flex justify-center mt-8 mx-8">
      <PageContentProvider pageShortName="main">
        <ContactCard />
      </PageContentProvider>
    </div>
  );
}
