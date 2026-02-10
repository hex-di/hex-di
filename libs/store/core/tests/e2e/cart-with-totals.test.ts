/**
 * E2E: Shopping Cart with Derived Totals
 *
 * Full end-to-end tests using real GraphBuilder + createContainer.
 */

import { describe, it, expect } from "vitest";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import {
  createStatePort,
  createStateAdapter,
  createDerivedPort,
  createDerivedAdapter,
} from "../../src/index.js";
import type { DerivedService, DeepReadonly } from "../../src/index.js";

// =============================================================================
// Types
// =============================================================================

interface CartItem {
  readonly name: string;
  readonly price: number;
  readonly qty: number;
}

interface CartState {
  readonly items: readonly CartItem[];
  readonly discountPercent: number;
}

interface CartTotal {
  readonly subtotal: number;
  readonly discount: number;
  readonly total: number;
}

const cartActions = {
  addItem: (state: CartState, item: CartItem): CartState => ({
    ...state,
    items: [...state.items, item],
  }),
  removeItem: (state: CartState, name: string): CartState => ({
    ...state,
    items: state.items.filter(i => i.name !== name),
  }),
  setDiscount: (state: CartState, percent: number): CartState => ({
    ...state,
    discountPercent: percent,
  }),
};

type CartActions = typeof cartActions;

// =============================================================================
// E2E Tests
// =============================================================================

describe("E2E: Cart with Totals", () => {
  it("derived CartTotal computes subtotal/discount/total", async () => {
    const CartPort = createStatePort<CartState, CartActions>()({
      name: "Cart",
    });
    const CartTotalPort = createDerivedPort<CartTotal>()({
      name: "CartTotal",
    });

    const cartAdapter = createStateAdapter({
      provides: CartPort,
      initial: { items: [], discountPercent: 0 },
      actions: cartActions,
    });

    const totalAdapter = createDerivedAdapter({
      provides: CartTotalPort,
      requires: [CartPort],
      select: deps => {
        const subtotal = deps.Cart.state.items.reduce(
          (sum, item) => sum + item.price * item.qty,
          0
        );
        const discount = subtotal * (deps.Cart.state.discountPercent / 100);
        return { subtotal, discount, total: subtotal - discount };
      },
    });

    const graph = GraphBuilder.create().provide(cartAdapter).provide(totalAdapter).build();
    const container = createContainer({ graph, name: "e2e-cart" });

    const cart = container.resolve(CartPort);
    const totals = container.resolve(CartTotalPort) as DerivedService<CartTotal>;

    expect(totals.value).toEqual({ subtotal: 0, discount: 0, total: 0 });

    cart.actions.addItem({ name: "Widget", price: 10, qty: 3 });
    cart.actions.addItem({ name: "Gadget", price: 25, qty: 1 });
    cart.actions.setDiscount(10);

    const val = totals.value as DeepReadonly<CartTotal>;
    expect(val.subtotal).toBe(55);
    expect(val.discount).toBe(5.5);
    expect(val.total).toBe(49.5);

    await container.dispose();
  });

  it("remove item → CartTotal updates", async () => {
    const CartPort = createStatePort<CartState, CartActions>()({
      name: "Cart",
    });
    const CartTotalPort = createDerivedPort<CartTotal>()({
      name: "CartTotal",
    });

    const cartAdapter = createStateAdapter({
      provides: CartPort,
      initial: { items: [], discountPercent: 0 },
      actions: cartActions,
    });

    const totalAdapter = createDerivedAdapter({
      provides: CartTotalPort,
      requires: [CartPort],
      select: deps => {
        const subtotal = deps.Cart.state.items.reduce(
          (sum, item) => sum + item.price * item.qty,
          0
        );
        const discount = subtotal * (deps.Cart.state.discountPercent / 100);
        return { subtotal, discount, total: subtotal - discount };
      },
    });

    const graph = GraphBuilder.create().provide(cartAdapter).provide(totalAdapter).build();
    const container = createContainer({ graph, name: "e2e-cart-remove" });

    const cart = container.resolve(CartPort);
    const totals = container.resolve(CartTotalPort) as DerivedService<CartTotal>;

    cart.actions.addItem({ name: "Apple", price: 2, qty: 5 });
    cart.actions.addItem({ name: "Banana", price: 1, qty: 10 });

    expect((totals.value as DeepReadonly<CartTotal>).subtotal).toBe(20);

    cart.actions.removeItem("Apple");

    expect((totals.value as DeepReadonly<CartTotal>).subtotal).toBe(10);
    expect((totals.value as DeepReadonly<CartTotal>).total).toBe(10);

    await container.dispose();
  });
});
