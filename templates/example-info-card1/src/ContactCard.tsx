import { CONTACT_CARD_TEST_IDS } from "./constants";
import { ContactCardContent } from "./content/contactCard";
import { usePageContentContext } from "@tcms/mini-app-react-utils";

export const ContactCard = () => {
  const { contentJson, isLoading } = usePageContentContext<ContactCardContent>();
  if (!contentJson || isLoading) return "Loading...";
  const { name, headline, bio, email, phone, heroImage, heroAltText, heroAlignment = "left" } = contentJson;
  const heroAlignmentClass = heroAlignment === "left" ? "" : "order-1";
  return (
    <div
      className="relative md:max-w-[700px] flex gap-6 border-0 border-gray-300 rounded-lg shadow-xl overflow-hidden"
      data-testid={CONTACT_CARD_TEST_IDS.root}
    >
      <div className={`flex-[2] -ml-6 -my-6 ${heroAlignmentClass}`}>
        <img className="absolute left-0 top-0 w-full object-cover max-w-none h-full -z-10" data-testid={CONTACT_CARD_TEST_IDS.heroImage} src={heroImage} alt={heroAltText} />
      </div>
      <div className="flex flex-1 flex-col text-gray-900 p-6 space-y-3 min-h-100 bg-white/80 backdrop-blur-sm">
        <div className="flex justify-between">
          <div className="flex flex-col space-y-3 font-serif justify-center">
            <div data-testid={CONTACT_CARD_TEST_IDS.name}>{name}</div>
            <div data-testid={CONTACT_CARD_TEST_IDS.headline}>{headline}</div>
          </div>
          <div className="flex flex-col space-y-3 text-end font-mono text-sm justify-center">
            <div data-testid={CONTACT_CARD_TEST_IDS.email}>{email}</div>
            <div data-testid={CONTACT_CARD_TEST_IDS.phone}>{phone}</div>
          </div>
        </div>
        <div className="flex-1 pt-3 leading-loose font-serif" data-testid={CONTACT_CARD_TEST_IDS.bio}>{bio}</div>
      </div>
    </div>
  );
};