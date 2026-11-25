export interface Celebrity {
  slug: string;
  name: string;
  audioSrc: string;
  imageSrc: string;
}

export const celebrities: Celebrity[] = [
  { slug: "AceVentura", name: "Ace Ventura", audioSrc: "/AceVentura.mp3", imageSrc: "/AceVentura.jpg" },
  { slug: "Arnie", name: "Arnie", audioSrc: "/Arnie.mp3", imageSrc: "/Arnie.jpg" },
  { slug: "AustinPowers", name: "Austin Powers", audioSrc: "/AustinPowers.mp3", imageSrc: "/AustinPowers.jpg" },
  { slug: "Borat", name: "Borat", audioSrc: "/Borat.mp3", imageSrc: "/Borat.jpg" },
  { slug: "ForestGump", name: "Forrest Gump", audioSrc: "/ForestGump.mp3", imageSrc: "/ForestGump.jpg" },
  { slug: "Gollum", name: "Gollum", audioSrc: "/Gollum.mp3", imageSrc: "/Gollum.jpg" },
];
