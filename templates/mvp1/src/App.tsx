import { ContactCard } from "./ContactCard";
import { contactCardContentSchema } from "./content/contactCard";
import { PageContentProvider } from "@pcms/mini-app-react-utils";

export function App() {
  return (
    <div className="flex justify-center mt-8 mx-8">
      <PageContentProvider contentSchema={contactCardContentSchema} pageShortName="main">
        <ContactCard />
      </PageContentProvider>
    </div>
  );
}
