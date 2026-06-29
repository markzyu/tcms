(() => {
  if (!window.pcms) {
    window.pcms = {};
  }
  if (!window.pcms.cdnRouter) {
    window.pcms.cdnRouter = {
      initialContentJson: {
        name: "John Doe",
        headline: "Photographer",
        bio: "John is a photographer based in New York City. He is known for his street photography and his use of color. He has been photographing for 10 years. His favorite camera is the Leica M10.",
        email: "john@example.com",
        phone: "123-456-7890",
        heroImage: "/assets/hero.jpg",
        heroAltText: "Example hero image. Blue Monday. Marina Bay Singapore. Provided by Wikimedia Commons Author: John.wp.phillips.",
        heroAlignment: "left",
      },
      getCDNType: () => "localCDN",
      getContentJsonPath: () => "/__query__/content.en.json",
      getInitialPreviewVariant: () => "en",
      getInstanceRootPath: () => "/",
      getOriginUrl: () => new URL("http://localhost:3000"),
      fetchContentJson: () => Promise.reject(new Error("Not implemented")),
      loadJsLibrary: () => Promise.resolve(),
      loadEsModule: () => Promise.resolve({}),
    };
  }
})();
