import { create } from 'zustand';

type CounterItem = {
  id: string;
  name: string;
  category?: string;
  source: 'photo' | 'manual' | 'barcode' | 'pantry-pull';
  photoRef?: string;
  confidence?: 'high' | 'medium' | 'low';
};

type CounterStore = {
  items: CounterItem[];
  addItem: (item: Omit<CounterItem, 'id'>) => void;
  addItems: (items: Omit<CounterItem, 'id'>[]) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, patch: Partial<CounterItem>) => void;
  clear: () => void;
};

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const useCounterStore = create<CounterStore>((set) => ({
  items: [],

  addItem: (item) =>
    set((state) => {
      const exists = state.items.some(
        (i) => i.name.toLowerCase() === item.name.toLowerCase()
      );
      if (exists) return state;
      return { items: [...state.items, { ...item, id: generateId() }] };
    }),

  addItems: (items) =>
    set((state) => {
      const existingNames = new Set(state.items.map((i) => i.name.toLowerCase()));
      const newItems = items
        .filter((item) => !existingNames.has(item.name.toLowerCase()))
        .map((item) => ({ ...item, id: generateId() }));
      return { items: [...state.items, ...newItems] };
    }),

  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

  updateItem: (id, patch) =>
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    })),

  clear: () => set({ items: [] }),
}));
