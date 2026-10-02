import type { BottleType } from "../game/types";
export const bottles: Record<
  BottleType,
  { color: string; light: string; path: string; capX: number; capW: number }
> = {
  water: {
    color: "#578d9c",
    light: "#d4e9eb",
    path: "M27 10H41V32C41 41 49 43 49 54V108Q49 115 42 115H26Q19 115 19 108V54C19 43 27 41 27 32Z",
    capX: 25,
    capW: 18,
  },
  lemon: {
    color: "#bc922f",
    light: "#f7e9ae",
    path: "M26 10H42V30C42 37 53 41 53 56V102Q53 115 41 115H27Q15 115 15 102V56C15 41 26 37 26 30Z",
    capX: 24,
    capW: 20,
  },
  berry: {
    color: "#9b6382",
    light: "#efdae8",
    path: "M27 10H41V31L47 40Q57 49 54 74L51 104Q50 115 40 115H28Q18 115 17 104L14 74Q11 49 21 40L27 31Z",
    capX: 25,
    capW: 18,
  },
  orange: {
    color: "#c57347",
    light: "#f5d7b7",
    path: "M24 10H44V29L53 44V108Q53 115 46 115H22Q15 115 15 108V44L24 29Z",
    capX: 22,
    capW: 24,
  },
  cola: {
    color: "#735344",
    light: "#e9d6b9",
    path: "M27 10H41V31Q51 42 50 58L46 78L51 104Q53 115 43 115H25Q15 115 17 104L22 78L18 58Q17 42 27 31Z",
    capX: 25,
    capW: 18,
  },
  mint: {
    color: "#59836b",
    light: "#dce8cf",
    path: "M29 10H39V38L45 49L49 101Q50 115 40 115H28Q18 115 19 101L23 49L29 38Z",
    capX: 26,
    capW: 16,
  },
};
