/** Example CMS JSON — what the mini-app template reads at render time. */
export interface MenuItem {
  name: string;
  price: string;
  description: string;
}

export interface MenuCmsData {
  restaurantName: string;
  tagline: string;
  items: MenuItem[];
}

export const exampleMenuCms: MenuCmsData = {
  restaurantName: "PCMS Demo Bistro",
  tagline: "Phone-hosted, no-build, SSR snapshot",
  items: [
    {
      name: "Margherita",
      price: "$12",
      description: "Tomato, mozzarella, basil",
    },
    {
      name: "Caesar Salad",
      price: "$9",
      description: "Romaine, parmesan, croutons",
    },
    {
      name: "Tiramisu",
      price: "$7",
      description: "Espresso-soaked layers, mascarpone",
    },
  ],
};
