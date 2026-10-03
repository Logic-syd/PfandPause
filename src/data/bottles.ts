import type { BottleType } from "../game/types";

export interface BottleDesign {
  /** Accent colors also identify the matching crate and order. */
  color: string;
  light: string;
  glass: string;
  edge: string;
  shade: string;
  path: string;
  shine: string;
  capX: number;
  capY: number;
  capW: number;
  crown: boolean;
  label: "oval" | "ticket" | "round" | "shield" | "diagonal";
  labelFill: string;
  labelInk: string;
}

// Original returnable-glass silhouettes, inspired by everyday German drinks.
// BottleType remains the only link between artwork, orders and game rules.
export const bottles: Record<BottleType, BottleDesign> = {
  water: {
    color: "#37758c",
    light: "#d9e9ed",
    glass: "#dcebea",
    edge: "#62858b",
    shade: "#9dbfc1",
    path: "M27 12H41V30Q41 36 47 41Q51 45 50 54L47 69L50 102V109Q50 116 43 116H25Q18 116 18 109V102L21 69L18 54Q17 45 21 41Q27 36 27 30Z",
    shine: "M30 18V31M24 45Q21 51 24 61M24 99V108",
    capX: 25,
    capY: 6,
    capW: 18,
    crown: false,
    label: "oval",
    labelFill: "#397a94",
    labelInk: "#fffbed",
  },
  lemon: {
    color: "#98721b",
    light: "#f3e8ba",
    glass: "#e2e9c3",
    edge: "#7e8951",
    shade: "#b3c28a",
    path: "M28 12H40V36L46 47Q48 51 48 59V109Q48 116 41 116H27Q20 116 20 109V59Q20 51 22 47L28 36Z",
    shine: "M31 20V34M25 53V62M25 103V109",
    capX: 25,
    capY: 7,
    capW: 18,
    crown: true,
    label: "ticket",
    labelFill: "#f3d675",
    labelInk: "#685522",
  },
  currant: {
    color: "#8d426d",
    light: "#efdae5",
    glass: "#dcc7c9",
    edge: "#816168",
    shade: "#b090a0",
    path: "M26 19H42V35L51 46Q54 49 54 57V108Q54 116 46 116H22Q14 116 14 108V57Q14 49 17 46L26 35Z",
    shine: "M29 25V34M20 54V65M20 104V109",
    capX: 24,
    capY: 13,
    capW: 20,
    crown: false,
    label: "ticket",
    labelFill: "#8e416f",
    labelInk: "#fff8eb",
  },
  apple: {
    color: "#47744a",
    light: "#dfe9d3",
    glass: "#d9dfad",
    edge: "#758344",
    shade: "#a6b678",
    path: "M26 18H42V32Q42 39 48 43Q54 48 54 61V103Q54 116 43 116H25Q14 116 14 103V61Q14 48 20 43Q26 39 26 32Z",
    shine: "M29 24V33M21 50Q19 54 20 63M20 103Q20 108 24 110",
    capX: 24,
    capY: 12,
    capW: 20,
    crown: false,
    label: "round",
    labelFill: "#4e7950",
    labelInk: "#fff8df",
  },
  malt: {
    color: "#795232",
    light: "#e9dbc6",
    glass: "#b48145",
    edge: "#604831",
    shade: "#77522f",
    path: "M26 28H42V42Q42 47 49 51Q56 56 56 66V105Q56 116 45 116H23Q12 116 12 105V66Q12 56 19 51Q26 47 26 42Z",
    shine: "M29 35V42M20 62V69M19 103Q19 108 23 109",
    capX: 23,
    capY: 22,
    capW: 22,
    crown: true,
    label: "shield",
    labelFill: "#f7e6bb",
    labelInk: "#73502e",
  },
  kola: {
    color: "#b45432",
    light: "#f0d8bf",
    glass: "#b99a61",
    edge: "#725a38",
    shade: "#8b6b3f",
    path: "M29 12H39V40Q39 46 45 51Q50 55 50 65V108Q50 116 42 116H26Q18 116 18 108V65Q18 55 23 51Q29 46 29 40Z",
    shine: "M32 20V40M24 58V65M24 103V109",
    capX: 25,
    capY: 7,
    capW: 18,
    crown: true,
    label: "diagonal",
    labelFill: "#c3643b",
    labelInk: "#fff5df",
  },
};
