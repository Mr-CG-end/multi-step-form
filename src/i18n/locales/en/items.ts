export default {
  plans: {
    "1": {
      name: "Arcade",
      monthly: "$9/mo",
      yearly: "$90/yr",
      discount: "2 months free",
    },
    "2": {
      name: "Advanced",
      monthly: "$12/mo",
      yearly: "$120/yr",
      discount: "2 months free",
    },
    "3": {
      name: "Pro",
      monthly: "$15/mo",
      yearly: "$150/yr",
      discount: "2 months free",
    },
  },
  addons: {
    "1": {
      title: "Online service",
      semititle: "Access to multiplayer games",
      monthly: "+$1/mo",
      yearly: "+$10/yr",
    },
    "2": {
      title: "Larger storage",
      semititle: "Extra 1TB of cloud save",
      monthly: "+$2/mo",
      yearly: "+$20/yr",
    },
    "3": {
      title: "Customizable profile",
      semititle: "Custom theme on your profile",
      monthly: "+$2/mo",
      yearly: "+$20/yr",
    },
  },
  priceFormat: {
    monthly: "${amount}/mo",
    yearly: "${amount}/yr",
  },
};
