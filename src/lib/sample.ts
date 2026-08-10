import type { Budget } from '../types';

// starter budget. small on purpose, just shows the shape
// leaves a leftover so unallocated shows up. no colors, palette handles it
export const DEFAULT_BUDGET: Budget = {
  sources: [{ id: 'src-net', label: 'Net Income', amount: 2800 }],
  categories: [
    { id: 'rent', label: 'Rent', amount: 950, items: [] },
    { id: 'groceries', label: 'Groceries', amount: 380, items: [] },
    { id: 'transport', label: 'Transport', amount: 150, items: [] },
    {
      id: 'leisure',
      label: 'Leisure',
      items: [
        { id: 'dining', label: 'Dining out', amount: 180 },
        { id: 'streaming', label: 'Subscriptions', amount: 25 },
      ],
    },
    {
      id: 'savings',
      label: 'Savings',
      items: [
        { id: 'emergency', label: 'Emergency Fund', amount: 150 },
        { id: 'investments', label: 'Investments', amount: 300 },
      ],
    },
  ],
};

// topbar menu. TODO more of these, freelancer / household split
export const BUDGET_EXAMPLES: { id: string; name: string; budget: Budget }[] = [
  { id: 'monthly', name: 'Monthly budget', budget: DEFAULT_BUDGET },
  {
    id: 'dual',
    name: 'Two incomes',
    budget: {
      sources: [
        { id: 'inc-a', label: 'Salary', amount: 2600 },
        { id: 'inc-b', label: 'Side income', amount: 500 },
      ],
      categories: [
        { id: 'housing', label: 'Housing', amount: 1200, items: [] },
        { id: 'living', label: 'Living', amount: 650, items: [] },
        { id: 'fun', label: 'Fun', amount: 300, items: [] },
        {
          id: 'save',
          label: 'Savings',
          items: [
            { id: 'etf', label: 'ETF', amount: 400 },
            { id: 'cash', label: 'Cash buffer', amount: 200 },
          ],
        },
      ],
    },
  },
];

// alias. fresh installs get this. two names for one thing, whatever
export const SAMPLE_BUDGET = DEFAULT_BUDGET;
