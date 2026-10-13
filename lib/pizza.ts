import { pizza } from "./config";
import type { Signup } from "./supabase";

export type PizzaOrder = {
  people: number;
  slices: number;
  larges: number;
  byType: { type: string; count: number }[];
  glutenFreePeople: number;
  glutenFreePizzas: number;
};

/**
 * Turn confirmed RSVPs into a pizza order.
 * Each group's slices are split across the toppings they picked;
 * "anything" groups are spread across the rest in proportion.
 */
export function pizzaOrder(confirmed: Signup[]): PizzaOrder {
  const want = new Map<string, number>(); // topping -> slices
  let flexible = 0;
  let slices = 0;
  let people = 0;
  let gfPeople = 0;

  for (const s of confirmed) {
    const gf = Math.min(s.gluten_free ?? 0, s.adults + s.kids);
    gfPeople += gf;
    // Gluten-free people get their own pizza, so take them out of the regular count
    const adults = Math.max(0, s.adults - gf);
    const kids = Math.max(0, s.kids - Math.max(0, gf - s.adults));
    const groupSlices = adults * pizza.slicesPerAdult + kids * pizza.slicesPerKid;
    people += s.adults + s.kids;
    slices += groupSlices;
    const picks = (s.pizza ?? "").split(",").map((p) => p.trim()).filter((p) => pizza.options.includes(p));
    if (picks.length === 0) {
      flexible += groupSlices;
    } else {
      for (const p of picks) want.set(p, (want.get(p) ?? 0) + groupSlices / picks.length);
    }
  }

  const larges = Math.ceil(slices / pizza.slicesPerLarge);
  const stated = [...want.values()].reduce((a, b) => a + b, 0);

  // Spread flexible slices in proportion to what people asked for (or cheese/pepperoni if nobody said)
  if (flexible > 0) {
    if (stated === 0) {
      want.set("Cheese", flexible / 2);
      want.set("Pepperoni", flexible / 2);
    } else {
      for (const [k, v] of want) want.set(k, v + (flexible * v) / stated);
    }
  }

  // Largest-remainder rounding so the toppings add up to the total
  const total = [...want.values()].reduce((a, b) => a + b, 0) || 1;
  const raw = [...want.entries()].map(([type, s]) => ({ type, exact: (s / total) * larges }));
  const rows = raw.map((r) => ({ type: r.type, count: Math.floor(r.exact), rem: r.exact - Math.floor(r.exact) }));
  let left = larges - rows.reduce((a, r) => a + r.count, 0);
  for (const r of [...rows].sort((a, b) => b.rem - a.rem)) {
    if (left <= 0) break;
    r.count++;
    left--;
  }

  return {
    people,
    slices,
    larges,
    byType: rows.filter((r) => r.count > 0).sort((a, b) => b.count - a.count).map(({ type, count }) => ({ type, count })),
    glutenFreePeople: gfPeople,
    glutenFreePizzas: Math.ceil((gfPeople * pizza.slicesPerAdult) / pizza.slicesPerGlutenFree),
  };
}
