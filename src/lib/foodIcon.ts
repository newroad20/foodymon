// Picks an Ionicons name for a typed menu so FoodyMon can be shown eating it (no photo case).
// Rows without their own icon still map to 'restaurant' so they win over later rows (김밥 before 우유).
export type FoodIcon = 'restaurant' | 'pizza' | 'fast-food' | 'egg' | 'leaf' | 'cafe' | 'nutrition' | 'ice-cream';

const FOODS: [RegExp, FoodIcon][] = [
  [/라면|국수|우동|짬뽕|짜장|파스타|스파게티|냉면|면/, 'restaurant'],
  [/김밥|초밥|스시|주먹밥/, 'restaurant'],
  [/빵|토스트|샌드위치|베이글|크루아상/, 'restaurant'],
  [/피자/, 'pizza'],
  [/햄버거|버거/, 'fast-food'],
  [/치킨|닭/, 'restaurant'],
  [/고기|삼겹|불고기|스테이크|갈비/, 'restaurant'],
  [/계란|달걀|에그/, 'egg'],
  [/샐러드|채소|야채/, 'leaf'],
  [/국|찌개|탕|수프|스프/, 'restaurant'],
  [/떡볶이|떡/, 'restaurant'],
  [/카레/, 'restaurant'],
  [/우유|두유/, 'cafe'],
  [/요거트|요구르트/, 'ice-cream'],
  [/사과|바나나|딸기|포도|귤|과일|수박|배/, 'nutrition'],
  [/과자|쿠키|초콜릿|사탕|젤리/, 'ice-cream'],
  [/케이크|디저트|아이스크림/, 'ice-cream'],
  [/커피|차|음료|주스/, 'cafe'],
  [/밥|덮밥|비빔밥|볶음밥|죽/, 'restaurant'],
];

export function foodIcon(menu: string): FoodIcon {
  return FOODS.find(([re]) => re.test(menu))?.[1] ?? 'restaurant';
}
