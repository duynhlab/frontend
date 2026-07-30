import { test as base, expect } from "@playwright/test";
import { NetworkContract } from "../contracts/network-contracts";
import { createMockState, type MockState } from "../mocks/state";
import { installApiMocks } from "../mocks/server";

interface AppFixtures {
  /** 'default' installs the route-mock dispatcher; 'none' opts out (gateway-style specs). */
  apiMocks: "default" | "none";
  mockState: MockState;
  contract: NetworkContract;
}

/**
 * Shared test base for the regression suite: per-test mock state, the API
 * dispatcher, and a NetworkContract that VERIFIES ON TEARDOWN — mutation
 * expectations registered with contract.expectCall() fail the test if the
 * request never fired, and unmocked/invariant-violating requests always fail.
 */
export const test = base.extend<AppFixtures>({
  apiMocks: ["default", { option: true }],

  mockState: async ({}, use) => {
    await use(createMockState());
  },

  contract: [
    async ({}, use) => {
      const contract = new NetworkContract();
      await use(contract);
      contract.verify();
    },
    { auto: true },
  ],

  context: async ({ context, apiMocks, mockState, contract }, use) => {
    if (apiMocks !== "none") {
      await installApiMocks(context, { state: mockState, contract });
    }
    await use(context);
  },
});

export { expect };
